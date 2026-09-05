import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {BattleSimulator} from './BattleSimulator';
import {WrapperForTests} from '../utils';
import {ServerSimulationResponse, StatRecord} from '../types';
import userEvent from '@testing-library/user-event';

jest.mock('./PageFooter');
jest.mock('posthog-js', () => ({capture: jest.fn()}));

const originalFetch = global.fetch;

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
    resolveResponse({ok: true, json: async(): Promise<ServerSimulationResponse> => ({wins: 1, loses: 0, draws: 0, winRatio: 100, attackerLooses: stats, defenderLooses: stats, spoils: []})});

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
