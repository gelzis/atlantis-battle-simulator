import draftFixture from './__fixtures__/draft-v1.json';
import baselineFixture from './__fixtures__/baseline-v1.json';
import {captureDraft, decodeRecord, isBaseline, isDraft, restoreDraft, STORAGE_KEYS, StoredRecord} from './persistence';
import {createAppStore} from './store';
import {changeItemAmount, saveUnit} from './actions/formActions';

beforeEach(() => localStorage.clear());

it('preserves another tab’s baseline when removal detects a conflict', () => {
    const original = JSON.stringify(baselineFixture);
    localStorage.setItem(STORAGE_KEYS.baseline, original);
    const record = new StoredRecord(() => localStorage, STORAGE_KEYS.baseline, isBaseline);
    const changed = JSON.stringify({...baselineFixture, savedAt: '2026-09-06T12:00:00.000Z'});
    localStorage.setItem(STORAGE_KEYS.baseline, changed);
    expect(record.remove()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.baseline)).toBe(changed);
    expect(record.value).toEqual(baselineFixture.data);
});

it('loads the frozen V1 draft contract, including unsaved edits, and recomputes totals', () => {
    const draft = decodeRecord(JSON.stringify(draftFixture), isDraft);
    const state = restoreDraft(draft);
    expect(state.attackerStats).toEqual({front: 0, back: 3, total: 3});
    expect(state.unit.items).toHaveLength(2);
    expect(state.unit.items[0].amount).toBe(7);
    expect(state.loading).toBe(false);
    expect(state.error.open).toBe(false);
    expect(captureDraft(state)).toEqual(draftFixture.data);
});

it('loads the frozen V1 baseline contract independently of the draft', () => {
    localStorage.setItem(STORAGE_KEYS.baseline, JSON.stringify(baselineFixture));
    const record = new StoredRecord(() => localStorage, STORAGE_KEYS.baseline, isBaseline);
    expect(record.value.result.winRate).toBe(40);
    const draft = new StoredRecord(() => localStorage, STORAGE_KEYS.draft, isDraft);
    expect(draft.save(decodeRecord(JSON.stringify(draftFixture), isDraft))).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.baseline)).toBe(JSON.stringify(baselineFixture));
});

it.each([
    'broken json',
    JSON.stringify({...draftFixture, schemaVersion: 999}),
    JSON.stringify({...draftFixture, data: {...draftFixture.data, editor: {...draftFixture.data.editor, id: '__proto__'}}}),
    JSON.stringify({...draftFixture, data: {...draftFixture.data, simulationCount: '50'}}),
    JSON.stringify({...draftFixture, data: {...draftFixture.data, attackers: [draftFixture.data.attackers[0], draftFixture.data.attackers[0]]}}),
])('preserves unreadable data and refuses to overwrite it', raw => {
    localStorage.setItem(STORAGE_KEYS.draft, raw);
    const record = new StoredRecord(() => localStorage, STORAGE_KEYS.draft, isDraft);
    expect(record.value).toBeUndefined();
    expect(record.warning).not.toBe('');
    expect(record.save(captureDraft(createAppStore().getState()))).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.draft)).toBe(raw);
});

it('survives unavailable storage and quota errors', () => {
    const denied = new StoredRecord(() => { throw new Error('Denied'); }, STORAGE_KEYS.draft, isDraft);
    expect(denied.save(draftFixture.data)).toBe(false);
    const storage = {getItem: (): string | null => null, removeItem: jest.fn(), setItem: () => { throw new Error('Quota'); }};
    const full = new StoredRecord(() => storage, STORAGE_KEYS.draft, isDraft);
    expect(full.save(draftFixture.data)).toBe(false);
    expect(full.warning).not.toBe('');
});

it('does not overwrite a record changed by another tab', () => {
    const record = new StoredRecord(() => localStorage, STORAGE_KEYS.draft, isDraft);
    const other = JSON.stringify(draftFixture);
    localStorage.setItem(STORAGE_KEYS.draft, other);
    expect(record.save(captureDraft(createAppStore().getState()))).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.draft)).toBe(other);
});

it('captures detached setup data that later edits cannot change', () => {
    const store = createAppStore();
    store.dispatch(saveUnit('attackers'));
    const captured = captureDraft(store.getState());
    store.dispatch(changeItemAmount(store.getState().unit.items[0].id, 12));
    expect(captured.editor.items[0].amount).toBe(1);
    expect(captured.attackers[0].items[0].amount).toBe(1);
});
