/** @jest-environment node */
import express from 'express';
import {randomUUID} from 'crypto';
import type {Server} from 'http';
import type {AddressInfo} from 'net';
import {SimulationJobs} from './simulationJobs';
import {simulationRoutes} from './simulationRoutes';
import {EngineFailure} from './engineRunner';

let server: Server;
let jobs: SimulationJobs;
let base: string;
const battle = {attackers: {units: [] as unknown[]}, defenders: {units: [] as unknown[]}};

beforeEach(async () => {
    jobs = new SimulationJobs(
        ':memory:',
        (_battle, _count, signal) =>
            new Promise((_resolve, reject) => {
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
