/** @jest-environment node */
import {mkdtemp, readdir, rm} from 'fs/promises';
import {tmpdir} from 'os';
import path from 'path';
import {createEngineRunner} from './engineRunner';

let temporaryRoot: string;
beforeEach(async() => { temporaryRoot = await mkdtemp(path.join(tmpdir(), 'atlantis-runner-test-')); });
afterEach(async() => {
    expect(await readdir(temporaryRoot)).toEqual([]);
    await rm(temporaryRoot, {recursive: true, force: true});
});

const runScript = (script: string, timeout = 1500, signal = new AbortController().signal, outputLimit = 4096) =>
    createEngineRunner(process.execPath, ['-e', script, '--'], outputLimit, temporaryRoot)({attackers: {}, defenders: {}}, 2, signal, timeout);

it('force-kills a process that ignores termination within the execution budget and cleans its request', async() => {
    const started = Date.now();
    await expect(runScript("process.on('SIGTERM', () => {}); setInterval(() => {}, 10);", 600))
        .rejects.toMatchObject({status: 'timed_out'});
    expect(Date.now() - started).toBeLessThan(1400);
});

it('cancels an executing process and cleans its request', async() => {
    const controller = new AbortController();
    const result = runScript('setInterval(() => {}, 10);', 1500, controller.signal);
    const timer = setTimeout(() => controller.abort(), 100);
    await expect(result).rejects.toMatchObject({status: 'cancelled'});
    clearTimeout(timer);
});

it.each([
    ['process.exit(1)', 'failed'],
    ["console.log('not JSON')", 'failed'],
    ["console.log('{}')", 'failed'],
    ["process.stdout.write('x'.repeat(8192)); setInterval(() => {}, 10);", 'failed'],
])('handles engine failure: %s', async(script, status) => {
    await expect(runScript(script)).rejects.toMatchObject({status});
});

it('handles an unavailable engine', async() => {
    await expect(createEngineRunner('/does-not-exist', [], 4096, temporaryRoot)({}, 1, new AbortController().signal, 1000))
        .rejects.toMatchObject({status: 'failed', message: expect.stringContaining('missing'), diagnostics: {launchError: expect.stringContaining('ENOENT')}});
});

it('identifies incompatible runtime libraries instead of blaming the battle setup', async() => {
    const stderr = "engine: /lib/libc.so.6: version `GLIBC_2.38' not found (required by engine)";
    await expect(runScript(`console.error(${JSON.stringify(stderr)}); process.exitCode = 1;`)).rejects.toMatchObject({
        status: 'failed', message: expect.stringContaining('glibc 2.38'), diagnostics: {exitCode: 1, signal: null, stderr: stderr + '\n'},
    });
});

it('preserves bounded stderr and the exit code for diagnostics', async() => {
    await expect(runScript("process.stderr.write('x'.repeat(10000)); process.exitCode = 2;", 1500, undefined, 20000)).rejects.toMatchObject({
        status: 'failed', message: expect.stringContaining('code 2'), diagnostics: {exitCode: 2, stderr: 'x'.repeat(8192)},
    });
});

it('identifies a missing system library', async() => {
    await expect(runScript("console.error('engine: error while loading shared libraries: libexample.so: cannot open shared object file'); process.exitCode = 127;"))
        .rejects.toMatchObject({message: expect.stringContaining('system library'), diagnostics: {exitCode: 127}});
});

it('reports signal termination distinctly from an engine exit code', async() => {
    await expect(runScript("process.kill(process.pid, 'SIGTERM');"))
        .rejects.toMatchObject({message: expect.stringContaining('SIGTERM'), diagnostics: {exitCode: null, signal: 'SIGTERM'}});
});

it('returns validated JSON with the existing wire field names', async() => {
    const stats = {min: 0, max: 1, range: 1, occurance: 1, mean: 1, median: 1, mode: 1, percentile: [1], stdDev: 0};
    const response = {wins: 2, loses: 0, draws: 0, winRatio: 100, attackerLooses: stats, defenderLooses: stats, spoils: [] as unknown[]};
    await expect(runScript(`console.log(${JSON.stringify(JSON.stringify(response))})`)).resolves.toEqual(response);
});
