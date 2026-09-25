import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {BattleSimulator} from './BattleSimulator';
import {WrapperForTests} from '../utils';
import {ServerSimulationResponse, StatRecord} from '../types';
import userEvent from '@testing-library/user-event';

jest.mock('./PageFooter');
jest.mock('posthog-js', () => ({capture: jest.fn()}));

const originalFetch = global.fetch;
beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
});

afterEach(() => {
    global.fetch = originalFetch;
});

const renderBattle = () => {
    render(<WrapperForTests><BattleSimulator/></WrapperForTests>);
    fireEvent.click(screen.getByTestId('add-to-attackers'));
    fireEvent.click(screen.getByTestId('add-to-defenders'));
};

it.each([
    ['network failure', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['HTTP error', () => Promise.resolve({ok: false})],
    ['invalid JSON', () => Promise.resolve({ok: true, json: () => Promise.reject(new SyntaxError('Invalid JSON'))})],
])('clears loading after %s and allows retry without losing units', async(_name, response) => {
    const fetchMock = jest.fn().mockImplementation(response);
    global.fetch = fetchMock;
    renderBattle();

    fireEvent.click(screen.getByRole('button', {name: 'Run battle'}));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/try.*again/));
    const retryButton = screen.getByRole('button', {name: 'Run battle'}) as HTMLButtonElement;
    expect(retryButton.disabled).toBe(false);

    fireEvent.click(retryButton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', {name: 'Run battle'})).toBeTruthy());
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
});

it('prevents duplicate requests and displays a successful result', async() => {
    let resolveResponse: (response: unknown) => void;
    global.fetch = jest.fn().mockReturnValue(new Promise(resolve => { resolveResponse = resolve; }));
    renderBattle();
    const runButton = screen.getByRole('button', {name: 'Run battle'}) as HTMLButtonElement;
    fireEvent.click(runButton);
    expect(runButton.disabled).toBe(true);
    fireEvent.click(runButton);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const stats: StatRecord = {min: 0, max: 0, range: 0, occurance: 0, mean: 0, median: 0, mode: 0, percentile: [], stdDev: 0};
    const id = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).requestId;
    (global.fetch as jest.Mock).mockResolvedValue({ok: true, json: async(): Promise<ServerSimulationResponse> => ({wins: 1, loses: 0, draws: 0, winRatio: 100, attackerLooses: stats, defenderLooses: stats, spoils: []})});
    resolveResponse({ok: true, json: async() => job(id, 'completed')});

    await waitFor(() => expect(screen.getByText('100.00%')).toBeTruthy());
    expect(runButton.disabled).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
});

it('uses migrated skill, structure and settings controls in the simulation request', async() => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ok: false});
    render(<WrapperForTests><BattleSimulator/></WrapperForTests>);

    await user.click(document.getElementById('skill-autocomplete-0'));
    await user.click(await screen.findByRole('option', {name: 'fire [FIRE]'}));
    fireEvent.change(screen.getByRole('slider'), {target: {value: '3'}});
    await user.click(screen.getByTestId('add-to-attackers'));

    await user.click(document.getElementById('attacker-structure-autocomplete'));
    await user.click(await screen.findByRole('option', {name: 'Tower'}));
    await user.click(screen.getByRole('button', {name: 'Simulation settings'}));
    const count = screen.getByLabelText('Amount of battles to run (max 100)');
    await user.clear(count);
    await user.type(count, '10');
    await user.click(screen.getByRole('button', {name: 'Save'}));
    await user.click(screen.getByRole('button', {name: 'Run battle'}));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    const request = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(request.battleCount).toBe(10);
    expect(request.battle.attackers.structures[0].type).toBe('Tower');
    expect(request.battle.attackers.structures[0].units[0].skills.known).toEqual([{tag: 'FIRE', level: 3}]);
});

const job = (id: string, status = 'running') => ({
    id,
    status,
    createdAt: Date.now(),
    startedAt: Date.now(),
    finishedAt: status === 'running' ? null : Date.now(),
    executionTimeoutMs: 300000,
    error: null as string | null,
});
const stats: StatRecord = {min: 0, max: 0, range: 0, occurance: 0, mean: 0, median: 0, mode: 0, percentile: [], stdDev: 0};
const result = {wins: 1, loses: 0, draws: 0, winRatio: 100, attackerLooses: stats, defenderLooses: stats, spoils: [] as unknown[]};

it('polls after a connection failure, shows timeout, and allows a new run', async() => {
    jest.useFakeTimers();
    try {
        let id: string;
        const fetchMock = jest.fn().mockImplementationOnce(async(_url, options) => {
            id = JSON.parse(options.body).requestId;
            return {ok: true, json: async() => job(id)};
        }).mockRejectedValueOnce(new Error('Offline')).mockImplementationOnce(async() => ({
            ok: true, json: async() => ({...job(id, 'timed_out'), error: 'Simulation exceeded its execution time limit.'}),
        }));
        global.fetch = fetchMock;
        renderBattle();
        await act(async() => fireEvent.click(screen.getByRole('button', {name: 'Run battle'})));
        expect(screen.getByRole('status').textContent).toContain('time limit 300s');
        await act(async() => jest.advanceTimersByTime(2000));
        expect(screen.getByRole('status').textContent).toContain('Reconnecting');
        expect((screen.getByRole('button', {name: 'Running battle'}) as HTMLButtonElement).disabled).toBe(true);
        await act(async() => jest.advanceTimersByTime(2000));
        expect(screen.getByRole('status').textContent).toContain('execution time limit');
        expect(screen.getByRole('button', {name: 'Run battle'})).toBeTruthy();
        expect(fetchMock.mock.calls.filter(call => call[1]?.method === 'POST')).toHaveLength(1);
    } finally { jest.useRealTimers(); }
});

it('recovers the existing job after refresh without submitting another simulation', async() => {
    let id: string;
    global.fetch = jest.fn().mockImplementationOnce(async(_url, options) => {
        id = JSON.parse(options.body).requestId;
        return {ok: true, json: async() => job(id)};
    });
    const first = render(<WrapperForTests><BattleSimulator/></WrapperForTests>);
    await act(async() => fireEvent.click(screen.getByRole('button', {name: 'Run battle'})));
    expect(screen.getByRole('status').textContent).toContain('Running');
    first.unmount();
    const recovered = jest.fn()
        .mockResolvedValueOnce({ok: true, json: async() => job(id, 'completed')})
        .mockResolvedValueOnce({ok: true, json: async() => result});
    global.fetch = recovered;
    render(<WrapperForTests><BattleSimulator/></WrapperForTests>);
    await screen.findByText('100.00%');
    expect(recovered.mock.calls.map(call => call[0])).toEqual([`/simulation-jobs/${id}`, `/simulation-jobs/${id}/result`]);
});

it('requests cancellation and waits for the terminal job status', async() => {
    jest.useFakeTimers();
    try {
        let id: string;
        global.fetch = jest.fn().mockImplementationOnce(async(_url, options) => {
            id = JSON.parse(options.body).requestId;
            return {ok: true, json: async() => job(id)};
        }).mockResolvedValueOnce({ok: true}).mockImplementationOnce(async() => ({
            ok: true, json: async() => ({...job(id, 'cancelled'), error: 'Simulation cancelled.'}),
        }));
        renderBattle();
        await act(async() => fireEvent.click(screen.getByRole('button', {name: 'Run battle'})));
        await act(async() => fireEvent.click(screen.getByRole('button', {name: 'Cancel simulation'})));
        expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe(`/simulation-jobs/${id}/cancel`);
        expect(screen.getByRole('button', {name: 'Cancelling…'})).toBeTruthy();
        await act(async() => jest.advanceTimersByTime(2000));
        expect(screen.getByRole('status').textContent).toBe('Simulation cancelled.');
        expect(screen.getByRole('button', {name: 'Run battle'})).toBeTruthy();
    } finally { jest.useRealTimers(); }
});

it('does not recover a local job on an unrelated shared battle page', async() => {
    global.fetch = jest.fn().mockImplementationOnce(async(_url, options) => ({
        ok: true, json: async() => job(JSON.parse(options.body).requestId),
    }));
    const first = render(<WrapperForTests><BattleSimulator/></WrapperForTests>);
    await act(async() => fireEvent.click(screen.getByRole('button', {name: 'Run battle'})));
    first.unmount();
    const sharedId = 'a'.repeat(64);
    window.history.replaceState({}, '', `/b/${sharedId}`);
    global.fetch = jest.fn().mockResolvedValue({ok: true, json: async() => ({battle: {attackers: {units: [] as unknown[]}, defenders: {units: [] as unknown[]}}})});
    render(<WrapperForTests><BattleSimulator/></WrapperForTests>);
    await waitFor(() => expect(screen.getByRole('button', {name: 'Run battle'})).toBeTruthy());
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(`/saved-battles/${sharedId}`);
});

it('preserves malformed recovery data and still runs simulations', async() => {
    sessionStorage.setItem('atlantis.simulationJob', '{broken');
    global.fetch = jest.fn().mockResolvedValue({ok: false});
    renderBattle();
    await act(async() => fireEvent.click(screen.getByRole('button', {name: 'Run battle'})));
    expect(sessionStorage.getItem('atlantis.simulationJob')).toBe('{broken');
    expect(screen.getByText(/Simulation recovery could not be saved/)).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledTimes(1);
});
