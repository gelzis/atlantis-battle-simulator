import React from 'react';
import {Provider} from 'react-redux';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {BaselineComparison, DraftStatus, LocalPersistence} from './LocalPersistence';
import {BattleSimulator} from './BattleSimulator';
import {createAppStore} from '../store';
import {changeItemAmount, saveUnit, setUnitsName} from '../actions/formActions';
import {editUnit} from '../actions/simulatorActions';
import {STORAGE_KEYS} from '../persistence';
import draftFixture from '../__fixtures__/draft-v1.json';
import baselineFixture from '../__fixtures__/baseline-v1.json';

jest.mock('./PageFooter');
jest.mock('posthog-js', () => ({capture: jest.fn()}));
const originalFetch = global.fetch;
beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
});
afterEach(() => { global.fetch = originalFetch; });

it('starts collapsed without a baseline, expands on pin, and removes only the baseline', async() => {
    const draft = JSON.stringify(draftFixture);
    localStorage.setItem(STORAGE_KEYS.draft, draft);
    const store = createAppStore();
    render(<Provider store={store}><LocalPersistence>
        <BaselineComparison current={baselineFixture.data} onRestore={jest.fn()}/>
    </LocalPersistence></Provider>);
    const toggle = screen.getByRole('button', {name: 'Compare battle results with baseline'});
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole('button', {name: 'Pin as baseline'}));
    expect(screen.getByRole('button', {name: 'Baseline comparison · Pinned'}).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', {name: 'Remove baseline'}));
    expect(localStorage.getItem(STORAGE_KEYS.baseline)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.draft)).toBe(draft);
    expect(screen.getByRole('button', {name: 'Compare battle results with baseline'}).getAttribute('aria-expanded')).toBe('false');
    expect(store.getState().unit.name).toBe('Unfinished edit');
});

it('restores unfinished edits and flushes new edits before the page closes', async() => {
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(draftFixture));
    const store = createAppStore();
    const view = render(<Provider store={store}><LocalPersistence><DraftStatus/></LocalPersistence></Provider>);
    expect(store.getState().unit.name).toBe('Unfinished edit');
    act(() => store.dispatch(setUnitsName('New draft name')));
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.draft)).data.editor.name).toBe('New draft name');
    view.unmount();
    const reloaded = createAppStore();
    render(<Provider store={reloaded}><LocalPersistence><DraftStatus/></LocalPersistence></Provider>);
    expect(reloaded.getState().unit.name).toBe('New draft name');
    expect(reloaded.getState().attackers['army-1'].items[0].amount).toBe(3);
});

it('does not restore or overwrite the local draft when visiting a shared battle', () => {
    const raw = JSON.stringify(draftFixture);
    localStorage.setItem(STORAGE_KEYS.draft, raw);
    window.history.replaceState({}, '', '/b/shared');
    const store = createAppStore();
    render(<Provider store={store}><LocalPersistence><DraftStatus/></LocalPersistence></Provider>);
    expect(store.getState().unit.name).toBe('Unit');
    act(() => store.dispatch(setUnitsName('Shared battle edits')));
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(localStorage.getItem(STORAGE_KEYS.draft)).toBe(raw);
});

it('shows neutral comparison differences and restores only after confirmation', async() => {
    localStorage.setItem(STORAGE_KEYS.baseline, JSON.stringify(baselineFixture));
    const current = {...baselineFixture.data, result: {...baselineFixture.data.result, winRate: 58, attackerMean: 0.4}};
    const store = createAppStore();
    const onRestore = jest.fn();
    render(<Provider store={store}><LocalPersistence><BaselineComparison current={current} onRestore={onRestore}/></LocalPersistence></Provider>);
    expect(screen.getByText('+18 pp')).toBeTruthy();
    expect(screen.getByText('-0.2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Restore baseline setup'}));
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(Object.keys(store.getState().attackers)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', {name: 'Restore baseline setup'}));
    fireEvent.click(screen.getByRole('button', {name: 'Restore'}));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(store.getState().attackerStructure).toBe('Tower');
    expect(store.getState().attackers['army-1'].items[0].amount).toBe(3);
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.draft)).not.toBeNull());
    expect(localStorage.getItem(STORAGE_KEYS.baseline)).toBe(JSON.stringify(baselineFixture));
});

it('pins the setup submitted to the engine even when the army is edited during the request', async() => {
    let finish: (value: unknown) => void;
    global.fetch = jest.fn().mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const store = createAppStore();
    store.dispatch(saveUnit('attackers'));
    const id = Object.keys(store.getState().attackers)[0];
    render(<Provider store={store}><LocalPersistence><BattleSimulator/></LocalPersistence></Provider>);
    fireEvent.click(screen.getByRole('button', {name: 'Run battle'}));
    act(() => {
        store.dispatch(editUnit(id));
        store.dispatch(changeItemAmount(store.getState().unit.items[0].id, 9));
        store.dispatch(saveUnit());
    });
    const stats = {min: 0, max: 1, range: 1, occurance: 1, mean: 1, median: 1, mode: 1, percentile: [1], stdDev: 0};
    await act(async() => finish({ok: true, json: async() => ({wins: 1, loses: 0, draws: 0, winRatio: 100, attackerLooses: stats, defenderLooses: stats, spoils: [] as unknown[]})}));
    fireEvent.click(await screen.findByRole('button', {name: 'Compare battle results with baseline'}));
    fireEvent.click(await screen.findByRole('button', {name: 'Pin as baseline'}));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.baseline));
    expect(saved.data.setup.attackers[0].items[0].amount).toBe(1);
    expect(store.getState().attackers[id].items[0].amount).toBe(9);
    expect(saved.data.result.winRate).toBe(100);
});
