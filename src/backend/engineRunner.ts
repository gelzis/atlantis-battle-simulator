import {spawn} from 'child_process';
import {mkdtemp, rm, writeFile} from 'fs/promises';
import {tmpdir} from 'os';
import path from 'path';
import {isSimulationResult} from '../shared/simulationJobs';
import type {ServerSimulationResponse} from '../frontend/BattleSimulator/types';

export type EngineDiagnostics = {
    exitCode: number | null;
    signal: string | null;
    stderr: string;
    launchError?: string;
};

export class EngineFailure extends Error {
    constructor(
        public status: 'failed' | 'timed_out' | 'cancelled',
        message: string,
        public diagnostics?: EngineDiagnostics,
    ) {
        super(message);
    }
}

export type EngineRunner = (
    battle: unknown,
    count: number,
    signal: AbortSignal,
    timeoutMs: number,
) => Promise<ServerSimulationResponse>;

// The same runner is exercised with small real child processes in tests.
export const createEngineRunner =
    (
        executable = path.join(__dirname, '../../src/engine/engine'),
        prefixArgs: string[] = [],
        maxOutputBytes = 16 * 1024 * 1024,
        temporaryRoot = tmpdir(),
    ): EngineRunner =>
    async (battle, count, signal, timeoutMs) => {
        const deadline = Date.now() + timeoutMs;
        const directory = await mkdtemp(path.join(temporaryRoot, 'atlantis-battle-'));
        try {
            const file = path.join(directory, 'battle.json');
            await writeFile(file, JSON.stringify(battle));
            if (signal.aborted) throw new EngineFailure('cancelled', 'Simulation cancelled.');
            if (Date.now() >= deadline)
                throw new EngineFailure('timed_out', 'Simulation exceeded its execution time limit.');
            return await new Promise<ServerSimulationResponse>((resolve, reject) => {
                const child = spawn(executable, [...prefixArgs, 'battle', file, String(count)], {
                    stdio: ['ignore', 'pipe', 'pipe'],
                });
                const output: Buffer[] = [];
                // Keep a bounded diagnostic excerpt even when stderr exhausts the output limit.
                const stderr: Buffer[] = [];
                let stderrBytes = 0;
                let launchError: string;
                let bytes = 0;
                let failure: EngineFailure;
                let cancelTimer: ReturnType<typeof setTimeout>;
                const graceMs = Math.min(2000, timeoutMs / 10);
                const terminate = (reason: EngineFailure) => {
                    if (failure) return;
                    failure = reason;
                    child.kill('SIGTERM');
                    cancelTimer = setTimeout(
                        () => child.kill('SIGKILL'),
                        Math.min(graceMs, Math.max(0, deadline - Date.now())),
                    );
                };
                // Reserve the grace period inside the deadline, not after it.
                const softTimer = setTimeout(
                    () => terminate(new EngineFailure('timed_out', 'Simulation exceeded its execution time limit.')),
                    Math.max(0, deadline - Date.now() - graceMs),
                );
                const hardTimer = setTimeout(
                    () => {
                        failure =
                            failure || new EngineFailure('timed_out', 'Simulation exceeded its execution time limit.');
                        child.kill('SIGKILL');
                    },
                    Math.max(0, deadline - Date.now()),
                );
                const abort = () => terminate(new EngineFailure('cancelled', 'Simulation cancelled.'));
                signal.addEventListener('abort', abort, {once: true});
                if (signal.aborted) abort();
                const collect = (chunk: Buffer, stdout: boolean) => {
                    if (!stdout && stderrBytes < 8192) {
                        const excerpt = chunk.subarray(0, 8192 - stderrBytes);
                        stderr.push(excerpt);
                        stderrBytes += excerpt.length;
                    }
                    bytes += chunk.length;
                    if (bytes > maxOutputBytes) {
                        failure = failure || new EngineFailure('failed', 'Simulation output exceeded the size limit.');
                        child.kill('SIGKILL');
                    } else if (stdout) output.push(chunk);
                };
                child.stdout.on('data', (chunk: Buffer) => collect(chunk, true));
                child.stderr.on('data', (chunk: Buffer) => collect(chunk, false));
                child.on('error', (error: Error & {code?: string}) => {
                    launchError = error.message;
                    const message =
                        error.code === 'ENOENT'
                            ? 'The simulation engine or its system loader is missing on the server.'
                            : error.code === 'EACCES'
                              ? 'The server does not have permission to execute the simulation engine.'
                              : 'Could not start the simulation engine. See server logs for details.';
                    failure = failure || new EngineFailure('failed', message);
                });
                child.on('close', (code, exitSignal) => {
                    clearTimeout(softTimer);
                    clearTimeout(hardTimer);
                    clearTimeout(cancelTimer);
                    signal.removeEventListener('abort', abort);
                    const diagnostics: EngineDiagnostics = {
                        exitCode: code,
                        signal: exitSignal,
                        stderr: Buffer.concat(stderr).toString('utf8'),
                        launchError,
                    };
                    if (failure) {
                        failure.diagnostics = diagnostics;
                        return reject(failure);
                    }
                    if (code !== 0) {
                        let message = exitSignal
                            ? `The simulation engine stopped unexpectedly (${exitSignal}). See server logs for details.`
                            : `The simulation engine exited with code ${code}. See server logs for details.`;
                        if (/version [`'](?:GLIBC|GLIBCXX|CXXABI)_[^\r\n]+not found/.test(diagnostics.stderr)) {
                            message =
                                'The server runtime is incompatible with the simulation engine. Run the backend using the Ubuntu 24.04 Docker image or a compatible Linux runtime (glibc 2.38 or newer).';
                        } else if (/error while loading shared libraries:/.test(diagnostics.stderr)) {
                            message =
                                'A system library required by the simulation engine is missing on the server. See server logs for details.';
                        }
                        return reject(new EngineFailure('failed', message, diagnostics));
                    }
                    try {
                        const result: unknown = JSON.parse(Buffer.concat(output).toString('utf8'));
                        if (!isSimulationResult(result)) throw new Error('Invalid result');
                        resolve(result);
                    } catch (error) {
                        reject(
                            new EngineFailure(
                                'failed',
                                'The simulation engine returned an invalid result. See server logs for details.',
                                diagnostics,
                            ),
                        );
                    }
                });
            });
        } finally {
            await rm(directory, {recursive: true, force: true});
        }
    };
