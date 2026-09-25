import sqlite3 from 'sqlite3';
import {mkdirSync} from 'fs';
import path from 'path';
import {canonicalBattleJson} from './battleStore';
import {createEngineRunner, EngineFailure, EngineRunner} from './engineRunner';
import {isActiveJob, SimulationJob} from '../shared/simulationJobs';

export type JobOptions = {
    executionTimeoutMs: number;
    queueTimeoutMs: number;
    maxQueued: number;
    maxConcurrent: number;
    retentionMs: number;
};
export const defaultJobOptions: JobOptions = {
    executionTimeoutMs: 300000,
    queueTimeoutMs: 600000,
    maxQueued: 20,
    maxConcurrent: 2,
    retentionMs: 60000,
};

export const jobOptionsFromEnv = (): JobOptions => {
    const read = (key: string, fallback: number, max: number) => {
        if (process.env[key] === undefined) return fallback;
        const value = Number(process.env[key]);
        if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${key}`);
        return value;
    };
    return {
        executionTimeoutMs: read('SIMULATION_TIMEOUT_MS', defaultJobOptions.executionTimeoutMs, 3600000),
        queueTimeoutMs: read('SIMULATION_QUEUE_TIMEOUT_MS', defaultJobOptions.queueTimeoutMs, 86400000),
        maxQueued: read('SIMULATION_MAX_QUEUED', defaultJobOptions.maxQueued, 1000),
        maxConcurrent: read('SIMULATION_MAX_CONCURRENT', defaultJobOptions.maxConcurrent, 2),
        retentionMs: read('SIMULATION_RETENTION_MS', defaultJobOptions.retentionMs, 604800000),
    };
};

type JobRow = SimulationJob & {battleJson: string; battleCount: number; resultJson: string | null};
export class JobRequestError extends Error {
    constructor(
        public statusCode: number,
        message: string,
    ) {
        super(message);
    }
}

// One scheduler owns this database. Deploy a single backend instance.
export class SimulationJobs {
    private database: sqlite3.Database;
    private serial: Promise<unknown> = Promise.resolve();
    private timer: ReturnType<typeof setInterval>;
    private active = new Map<string, {controller: AbortController; finished: Promise<void>}>();
    private stopped = false;

    constructor(
        databasePath: string,
        private runner: EngineRunner = createEngineRunner(),
        private options = defaultJobOptions,
    ) {
        if (databasePath !== ':memory:') mkdirSync(path.dirname(databasePath), {recursive: true});
        this.database = new sqlite3.Database(databasePath);
        this.database.configure('busyTimeout', 5000);
    }

    private exclusive<T>(operation: () => Promise<T>): Promise<T> {
        const next = this.serial.then(operation);
        this.serial = next.catch((): undefined => undefined);
        return next;
    }

    private run(sql: string, params: unknown[] = []): Promise<void> {
        return new Promise((resolve, reject) =>
            this.database.run(sql, params, (error) => (error ? reject(error) : resolve())),
        );
    }

    private rows(sql: string, params: unknown[] = []): Promise<JobRow[]> {
        return new Promise((resolve, reject) =>
            this.database.all(sql, params, (error, rows: JobRow[]) => (error ? reject(error) : resolve(rows))),
        );
    }

    async initialize(): Promise<void> {
        await this.run(`CREATE TABLE IF NOT EXISTS simulation_jobs (
            id TEXT PRIMARY KEY, status TEXT NOT NULL, battleJson TEXT NOT NULL, battleCount INTEGER NOT NULL,
            createdAt INTEGER NOT NULL, startedAt INTEGER, finishedAt INTEGER, executionTimeoutMs INTEGER NOT NULL,
            error TEXT, resultJson TEXT
        )`);
        await this.run('CREATE INDEX IF NOT EXISTS simulation_jobs_status ON simulation_jobs(status, createdAt)');
        await this.run(
            "UPDATE simulation_jobs SET status = 'failed', finishedAt = ?, error = ? WHERE status = 'running'",
            [Date.now(), 'Simulation interrupted by a server restart. Please run it again.'],
        );
        await this.tick();
        this.timer = setInterval(() => {
            this.tick().catch(console.error);
        }, 1000);
        this.timer.unref?.();
    }

    private publicJob(row: JobRow): SimulationJob {
        const {id, status, createdAt, startedAt, finishedAt, executionTimeoutMs, error} = row;
        return {id, status, createdAt, startedAt, finishedAt, executionTimeoutMs, error};
    }

    async get(id: string): Promise<SimulationJob | undefined> {
        const row = (await this.rows('SELECT * FROM simulation_jobs WHERE id = ?', [id]))[0];
        return row && this.publicJob(row);
    }

    async result(id: string): Promise<unknown> {
        const row = (await this.rows('SELECT * FROM simulation_jobs WHERE id = ?', [id]))[0];
        if (!row) throw new JobRequestError(404, 'Simulation job not found or expired.');
        if (row.status !== 'completed') throw new JobRequestError(409, 'Simulation result is not available.');
        return JSON.parse(row.resultJson);
    }

    acknowledge(id: string): Promise<void> {
        return this.exclusive(async () => {
            const job = await this.get(id);
            // Retrying a lost acknowledgement response is safe after deletion or expiry.
            if (!job) return;
            if (job.status !== 'completed')
                throw new JobRequestError(409, 'Only completed simulation results can be acknowledged.');
            await this.run("DELETE FROM simulation_jobs WHERE id = ? AND status = 'completed'", [id]);
        });
    }

    submit(id: string, battle: unknown, battleCount: number): Promise<SimulationJob> {
        return this.exclusive(async () => {
            if (this.stopped) throw new JobRequestError(503, 'The simulation service is stopping.');
            const battleJson = canonicalBattleJson(battle);
            const existing = (await this.rows('SELECT * FROM simulation_jobs WHERE id = ?', [id]))[0];
            if (existing) {
                if (existing.battleJson !== battleJson || existing.battleCount !== battleCount) {
                    throw new JobRequestError(409, 'This submission ID belongs to a different simulation.');
                }
                return this.publicJob(existing);
            }
            await this.schedule();
            const queued = await this.rows("SELECT id FROM simulation_jobs WHERE status = 'queued'");
            if (queued.length >= this.options.maxQueued)
                throw new JobRequestError(429, 'The simulation queue is full. Please try again later.');
            await this.run(
                `INSERT INTO simulation_jobs (id, status, battleJson, battleCount, createdAt, executionTimeoutMs)
                VALUES (?, 'queued', ?, ?, ?, ?)`,
                [id, battleJson, battleCount, Date.now(), this.options.executionTimeoutMs],
            );
            await this.schedule();
            return this.get(id);
        });
    }

    cancel(id: string): Promise<SimulationJob> {
        return this.exclusive(async () => {
            const job = await this.get(id);
            if (!job) throw new JobRequestError(404, 'Simulation job not found or expired.');
            if (job.status === 'queued') {
                await this.run(
                    "UPDATE simulation_jobs SET status = 'cancelled', finishedAt = ?, error = ? WHERE id = ?",
                    [Date.now(), 'Simulation cancelled.', id],
                );
            } else if (job.status === 'running') {
                this.active.get(id)?.controller.abort();
            }
            return this.get(id);
        });
    }

    tick(): Promise<void> {
        return this.exclusive(() => this.schedule());
    }

    private async schedule(): Promise<void> {
        if (this.stopped) return;
        const now = Date.now();
        await this.run(
            "UPDATE simulation_jobs SET status = 'expired', finishedAt = ?, error = ? WHERE status = 'queued' AND createdAt <= ?",
            [
                now,
                'Simulation expired while waiting in the queue. Please run it again.',
                now - this.options.queueTimeoutMs,
            ],
        );
        await this.run('DELETE FROM simulation_jobs WHERE finishedAt <= ?', [now - this.options.retentionMs]);
        while (!this.stopped && this.active.size < this.options.maxConcurrent) {
            const next = (
                await this.rows(
                    "SELECT * FROM simulation_jobs WHERE status = 'queued' ORDER BY createdAt, rowid LIMIT 1",
                )
            )[0];
            if (!next) return;
            await this.run("UPDATE simulation_jobs SET status = 'running', startedAt = ? WHERE id = ?", [now, next.id]);
            const controller = new AbortController();
            // Invoke through a promise so synchronous runner failures also release the slot.
            const finished = Promise.resolve()
                .then(() =>
                    this.runner(
                        JSON.parse(next.battleJson),
                        next.battleCount,
                        controller.signal,
                        next.executionTimeoutMs,
                    ),
                )
                .then(
                    (result) => this.finish(next.id, 'completed', JSON.stringify(result), null),
                    (error) => {
                        const failure =
                            error instanceof EngineFailure
                                ? error
                                : new EngineFailure('failed', 'Simulation could not be completed.');
                        if (failure.status === 'failed') {
                            console.error('Simulation engine failure', {
                                jobId: next.id,
                                message: failure.message,
                                diagnostics: failure.diagnostics || String(error),
                            });
                        }
                        return this.finish(next.id, failure.status, null, failure.message);
                    },
                )
                .catch(console.error);
            this.active.set(next.id, {controller, finished});
        }
    }

    private finish(
        id: string,
        status: SimulationJob['status'],
        result: string | null,
        error: string | null,
    ): Promise<void> {
        return this.exclusive(async () => {
            if (this.stopped && isActiveJob((await this.get(id)).status)) {
                status = 'failed';
                error = 'Simulation interrupted by a server shutdown. Please run it again.';
                result = null;
            }
            await this.run(
                'UPDATE simulation_jobs SET status = ?, finishedAt = ?, resultJson = ?, error = ? WHERE id = ?',
                [status, Date.now(), result, error, id],
            );
            this.active.delete(id);
            await this.schedule();
        });
    }

    async close(): Promise<void> {
        this.stopped = true;
        clearInterval(this.timer);
        await this.serial;
        const active = [...this.active.values()];
        active.forEach((job) => job.controller.abort());
        await Promise.all(active.map((job) => job.finished));
        await this.serial;
        await new Promise<void>((resolve, reject) =>
            this.database.close((error) => (error ? reject(error) : resolve())),
        );
    }
}
