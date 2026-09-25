/** @jest-environment node */
import express from 'express';
import {randomUUID} from 'crypto';
import type {Server} from 'http';
import type {AddressInfo} from 'net';
import {SimulationJobs} from './simulationJobs';
import {simulationRoutes} from './simulationRoutes';
import {EngineFailure} from './engineRunner';
import type {ServerSimulationResponse} from '../frontend/BattleSimulator/types';

let server: Server;
let jobs: SimulationJobs;
let base: string;
let complete: (value: ServerSimulationResponse) => void;
const battle = {attackers: {units: [] as unknown[]}, defenders: {units: [] as unknown[]}};

beforeEach(async () => {
    jobs = new SimulationJobs(
        ':memory:',
        (_battle, _count, signal) =>
            new Promise((resolve, reject) => {
                complete = resolve;
                signal.addEventListener('abort', () => reject(new EngineFailure('cancelled', 'Simulation cancelled.')));
            }),
    );
    await jobs.initialize();
    const app = express();
    app.use(express.json());
    app.use(simulationRoutes(jobs));
    await new Promise<void>((resolve, reject) => {
        server = app.listen(0, '127.0.0.1', () => resolve());
        server.on('error', reject);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
    await jobs.close();
    if (server?.listening)
        await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

const post = (route: string, body: unknown) =>
    fetch(`${base}${route}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
    });

it('accepts a job immediately, reports status, and supports cancellation', async () => {
    const id = randomUUID();
    const response = await post('/simulation-jobs', {requestId: id, battle, battleCount: 50});
    expect(response.status).toBe(202);
    expect(response.headers.get('location')).toBe(`/simulation-jobs/${id}`);
    expect(await response.json()).toMatchObject({id, status: 'running', executionTimeoutMs: 300000});
    const status = await fetch(`${base}/simulation-jobs/${id}`);
    expect(status.headers.get('cache-control')).toBe('no-store');
    expect(await status.json()).toMatchObject({id, status: 'running'});
    expect((await fetch(`${base}/simulation-jobs/${id}/result`)).status).toBe(409);
    expect((await post(`/simulation-jobs/${id}/cancel`, {})).status).toBe(200);
    expect((await post('/simulation-jobs', {requestId: id, battle, battleCount: 50})).status).toBe(202);
});

it('rejects invalid requests and missing IDs', async () => {
    expect((await post('/simulation-jobs', {requestId: randomUUID(), battle: {}})).status).toBe(400);
    expect((await post('/simulation-jobs', {requestId: '../bad', battle})).status).toBe(400);
    expect((await fetch(`${base}/simulation-jobs/bad`)).status).toBe(404);
    expect((await fetch(`${base}/simulation-jobs/${randomUUID()}`)).status).toBe(404);
});

it('deletes a completed result only on acknowledgement and accepts repeated acknowledgements', async () => {
    const id = randomUUID();
    await post('/simulation-jobs', {requestId: id, battle, battleCount: 50});
    expect((await post(`/simulation-jobs/${id}/acknowledge`, {})).status).toBe(409);
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
    complete(result);
    for (let attempt = 0; attempt < 100 && (await jobs.get(id)).status !== 'completed'; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(await (await fetch(`${base}/simulation-jobs/${id}/result`)).json()).toEqual(result);
    expect((await fetch(`${base}/simulation-jobs/${id}/result`)).status).toBe(200);
    expect((await post(`/simulation-jobs/${id}/acknowledge`, {})).status).toBe(204);
    expect((await fetch(`${base}/simulation-jobs/${id}`)).status).toBe(404);
    expect((await fetch(`${base}/simulation-jobs/${id}/result`)).status).toBe(404);
    expect((await post(`/simulation-jobs/${id}/acknowledge`, {})).status).toBe(204);
});
