import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {SimulationResult} from './SimulationResult';
import {ServerSimulationResponse, StatRecord} from '../types';

const stats: StatRecord = {min: 0, max: 1, range: 1, occurance: 30, mean: 0.6, median: 1, mode: 1, percentile: [0, 1], stdDev: 0.49};
const result: ServerSimulationResponse = {
    wins: 20,
    loses: 30,
    draws: 0,
    winRatio: 40,
    attackerLooses: stats,
    defenderLooses: {...stats, occurance: 20, mean: 0.4, median: 0, mode: 0},
    spoils: [],
    victoryBattleText: 'Victory log contents',
    lossBattleText: 'Defeat log contents',
};

it('shows a compact summary and side-by-side casualty values', () => {
    render(<SimulationResult {...result}/>);
    expect(screen.getByText('50 simulations')).toBeTruthy();
    expect(screen.getByText('40.00%')).toBeTruthy();
    expect(screen.getByRole('progressbar', {name: 'Attacker win rate'}).getAttribute('aria-valuenow')).toBe('40');
    const row = screen.getByRole('row', {name: 'Average per battle 0.6 0.4'});
    expect(within(row).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['0.6', '0.4']);
    expect(screen.getByRole('button', {name: 'Detailed casualty statistics'}).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', {name: 'Example battle logs'}).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', {name: 'Spoils'})).toBeNull();
});

it('expands statistics and switches between only the available battle outcomes', async() => {
    render(<SimulationResult {...result}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Detailed casualty statistics'}));
    expect(await screen.findAllByText('Std. dev.')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', {name: 'Example battle logs'}));
    expect(await screen.findByRole('tabpanel', {name: 'Victory'})).toBeTruthy();
    expect(screen.queryByRole('tab', {name: 'Draw'})).toBeNull();
    fireEvent.click(screen.getByRole('tab', {name: 'Defeat'}));
    expect(screen.getByRole('tabpanel', {name: 'Defeat'}).textContent).toContain('Defeat log contents');
    expect(screen.queryByText('Victory log contents')).toBeNull();
});

it('supports a result with only a defeat example and expandable spoils', async() => {
    render(<SimulationResult {...result} victoryBattleText={undefined} spoils={[{...stats, item: 'silver'}]}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Spoils'}));
    expect(await screen.findByRole('cell', {name: 'silver'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Example battle logs'}));
    expect(await screen.findByRole('tabpanel', {name: 'Defeat'})).toBeTruthy();
    expect(screen.queryByRole('tab', {name: 'Victory'})).toBeNull();
});

it('omits the logs section when no examples are available', () => {
    render(<SimulationResult {...result} victoryBattleText={undefined} lossBattleText={undefined}/>);
    expect(screen.queryByRole('button', {name: 'Example battle logs'})).toBeNull();
});
