/** @jest-environment node */
import {randomUUID} from 'crypto';
import {mkdtemp, rm} from 'fs/promises';
import {tmpdir} from 'os';
import path from 'path';
import sqlite3 from 'sqlite3';
import {defaultJobOptions, SimulationJobs} from './simulationJobs';
import {EngineFailure, EngineRunner} from './engineRunner';
import type {ServerSimulationResponse} from '../frontend/BattleSimulator/types';

const battle = {attackers: {units: [] as unknown[]}, defenders: {units: [] as unknown[]}};
const stats = {min: 0, max: 1, range: 1, occurance: 1, mean: 1, median: 1, mode: 1, percentile: [1], stdDev: 0};
const result: ServerSimulationResponse = {
    wins: 1,
    loses: 0,
    draws: 0,
    winRatio: 100,
    attackerLooses: stats,
    defenderLooses: stats,
    spoils: [],
};
let jobs: SimulationJobs;
let complete: (result: ServerSimulationResponse) => void;
let fail: (error: Error) => void;
let runner: jest.MockedFunction<EngineRunner>;

beforeEach(async () => {
    runner = jest.fn<ReturnType<EngineRunner>, Parameters<EngineRunner>>(
        (_battle, _count, signal) =>
            new Promise((resolve, reject) => {
                complete = resolve;
                fail = reject;
                signal.addEventListener('abort', () => reject(new EngineFailure('cancelled', 'Simulation cancelled.')));
            }),
    );
    jobs = new SimulationJobs(':memory:', runner, {...defaultJobOptions, maxQueued: 1});
    await jobs.initialize();
});
afterEach(async () => {
    jest.restoreAllMocks();
    await jobs.close();
});

async function waitForStatus(id: string, status: string): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt++) {
        if ((await jobs.get(id)).status === status) return;
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect((await jobs.get(id)).status).toBe(status);
}

it('runs one engine at a time, bounds the waiting queue, and retains the result', async () => {
    const first = await jobs.submit(randomUUID(), battle, 50);
    const second = await jobs.submit(randomUUID(), battle, 10);
    expect(first.status).toBe('running');
    expect(second.status).toBe('queued');
    expect(runner).toHaveBeenCalledTimes(1);
    await expect(jobs.submit(randomUUID(), battle, 10)).rejects.toMatchObject({statusCode: 429});
    complete(result);
    await waitForStatus(second.id, 'running');
    expect(runner).toHaveBeenCalledTimes(2);
    expect(runner.mock.calls[1][1]).toBe(10);
    expect(runner.mock.calls[0][3]).toBe(300000);
    await expect(jobs.result(first.id)).resolves.toEqual(result);
    await expect(jobs.result(second.id)).rejects.toMatchObject({statusCode: 409});
});

it('deduplicates simultaneous submission retries and rejects changed content for the same ID', async () => {
    const id = randomUUID();
    const requests = await Promise.all([jobs.submit(id, battle, 50), jobs.submit(id, battle, 50)]);
    expect(requests[0].id).toBe(requests[1].id);
    expect(runner).toHaveBeenCalledTimes(1);
    await expect(jobs.submit(id, battle, 10)).rejects.toMatchObject({statusCode: 409});
});

it('keeps downloads retryable until acknowledgement, then deletes the job idempotently', async () => {
    const submitted = await jobs.submit(randomUUID(), battle, 50);
    complete(result);
    await waitForStatus(submitted.id, 'completed');
    await expect(jobs.result(submitted.id)).resolves.toEqual(result);
    await expect(jobs.result(submitted.id)).resolves.toEqual(result);
    await jobs.acknowledge(submitted.id);
    expect(await jobs.get(submitted.id)).toBeUndefined();
    await expect(jobs.result(submitted.id)).rejects.toMatchObject({statusCode: 404});
    await expect(jobs.acknowledge(submitted.id)).resolves.toBeUndefined();
});

it('does not delete queued or running jobs on premature acknowledgement', async () => {
    const running = await jobs.submit(randomUUID(), battle, 50);
    const queued = await jobs.submit(randomUUID(), battle, 50);
    await expect(jobs.acknowledge(running.id)).rejects.toMatchObject({statusCode: 409});
    await expect(jobs.acknowledge(queued.id)).rejects.toMatchObject({statusCode: 409});
    expect((await jobs.get(running.id)).status).toBe('running');
    expect((await jobs.get(queued.id)).status).toBe('queued');
});

it('expires an unacknowledged result one minute after completion, not submission', async () => {
    const submitted = await jobs.submit(randomUUID(), battle, 50);
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 240000);
    complete(result);
    await waitForStatus(submitted.id, 'completed');
    jest.spyOn(Date, 'now').mockReturnValue(now + 299999);
    await jobs.tick();
    await expect(jobs.result(submitted.id)).resolves.toEqual(result);
    jest.spyOn(Date, 'now').mockReturnValue(now + 300000);
    await jobs.tick();
    expect(await jobs.get(submitted.id)).toBeUndefined();
});

it('cancels queued jobs without starting them and releases running jobs after termination', async () => {
    const first = await jobs.submit(randomUUID(), battle, 50);
    const second = await jobs.submit(randomUUID(), battle, 50);
    expect((await jobs.cancel(second.id)).status).toBe('cancelled');
    await jobs.cancel(first.id);
    await waitForStatus(first.id, 'cancelled');
    expect(runner).toHaveBeenCalledTimes(1);
    expect((await jobs.submit(randomUUID(), battle, 50)).status).toBe('running');
});

it('records timeouts and starts the next job after the process stops', async () => {
    const first = await jobs.submit(randomUUID(), battle, 50);
    const second = await jobs.submit(randomUUID(), battle, 50);
    fail(new EngineFailure('timed_out', 'Execution time limit exceeded.'));
    await waitForStatus(second.id, 'running');
    expect(await jobs.get(first.id)).toMatchObject({status: 'timed_out', error: 'Execution time limit exceeded.'});
});

it('expires waiting jobs without running them and prunes terminal records after retention', async () => {
    await jobs.submit(randomUUID(), battle, 50);
    const queued = await jobs.submit(randomUUID(), battle, 50);
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + defaultJobOptions.queueTimeoutMs + 1);
    await jobs.tick();
    expect((await jobs.get(queued.id)).status).toBe('expired');
    expect(runner).toHaveBeenCalledTimes(1);
    jest.spyOn(Date, 'now').mockReturnValue(now + defaultJobOptions.queueTimeoutMs + defaultJobOptions.retentionMs + 2);
    await jobs.tick();
    expect(await jobs.get(queued.id)).toBeUndefined();
});

it('persists results and marks interrupted jobs failed across server restarts', async () => {
    await jobs.close();
    const directory = await mkdtemp(path.join(tmpdir(), 'atlantis-jobs-'));
    const file = path.join(directory, 'jobs.sqlite');
    try {
        jobs = new SimulationJobs(file, runner);
        await jobs.initialize();
        const finished = await jobs.submit(randomUUID(), battle, 50);
        complete(result);
        await waitForStatus(finished.id, 'completed');
        const interrupted = await jobs.submit(randomUUID(), battle, 50);
        const queued = await jobs.submit(randomUUID(), battle, 50);
        await jobs.close();
        // Model the durable record left by an unexpected process exit.
        const database = new sqlite3.Database(file);
        await new Promise<void>((resolve, reject) =>
            database.run(
                "UPDATE simulation_jobs SET status = 'running', finishedAt = NULL WHERE id = ?",
                [interrupted.id],
                (error) => (error ? reject(error) : resolve()),
            ),
        );
        await new Promise<void>((resolve, reject) => database.close((error) => (error ? reject(error) : resolve())));
        jobs = new SimulationJobs(file, runner);
        await jobs.initialize();
        await expect(jobs.result(finished.id)).resolves.toEqual(result);
        expect(await jobs.get(interrupted.id)).toMatchObject({
            status: 'failed',
            error: expect.stringContaining('restart'),
        });
        expect((await jobs.get(queued.id)).status).toBe('running');
    } finally {
        await jobs.close();
        await rm(directory, {recursive: true, force: true});
        jobs = new SimulationJobs(':memory:', runner);
        await jobs.initialize();
    }
});
