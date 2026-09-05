// Public local-storage contract. Keep V1 stable; introduce a migration for future changes.
import {AppState, ServerSimulationResponse} from './types';
import {reducer} from './reducer';
import {addUnit, resetState} from './actions/simulatorActions';

export type UnitV1 = {
    id: string
    name: string
    items: {id: string, abbr: string, name: string, amount: number}[]
    skills: {id: string, abbr: string, name: string, level: number, combatSpell: boolean}[]
    combatSpell: string
    behind: boolean
};
export type DraftV1 = {
    attackers: UnitV1[]
    defenders: UnitV1[]
    editor: UnitV1
    attackerStructure: string | null
    defenderStructure: string | null
    simulationCount: number
};
export type BaselineV1 = {
    setup: DraftV1
    completedAt: string
    result: {wins: number, draws: number, losses: number, winRate: number, attackerMean: number, defenderMean: number}
};
export const STORAGE_KEYS = {draft: 'atlantis.draft', baseline: 'atlantis.baseline'};
export type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const count = (v: unknown): v is number => number(v) && Number.isInteger(v);
const string = (v: unknown): v is string => typeof v === 'string';
const strings = (v: Record<string, unknown>, keys: string[]) => keys.every(key => string(v[key]));
const uniqueIds = (values: {id: string}[]) => new Set(values.map(value => value.id)).size === values.length;
const date = (v: unknown): v is string => string(v) && Number.isFinite(Date.parse(v));

const isUnit = (v: unknown): v is UnitV1 => object(v) && strings(v, ['id', 'name', 'combatSpell']) &&
    !['__proto__', 'constructor', 'prototype'].includes(String(v.id)) &&
    typeof v.behind === 'boolean' && Array.isArray(v.items) && Array.isArray(v.skills) &&
    v.items.every(item => object(item) && strings(item, ['id', 'abbr', 'name']) && count(item.amount)) &&
    v.skills.every(skill => object(skill) && strings(skill, ['id', 'abbr', 'name']) && count(skill.level) &&
        typeof skill.combatSpell === 'boolean') && uniqueIds(v.items) && uniqueIds(v.skills);

export const isDraft = (v: unknown): v is DraftV1 => object(v) &&
    Array.isArray(v.attackers) && v.attackers.every(isUnit) && Array.isArray(v.defenders) && v.defenders.every(isUnit) &&
    [...v.attackers, ...v.defenders].every(unit => !!unit.id && !['__proto__', 'constructor', 'prototype'].includes(unit.id)) &&
    uniqueIds([...v.attackers, ...v.defenders]) && isUnit(v.editor) &&
    (v.attackerStructure === null || string(v.attackerStructure)) &&
    (v.defenderStructure === null || string(v.defenderStructure)) && count(v.simulationCount) &&
    v.simulationCount >= 1 && v.simulationCount <= 100;

export const isBaseline = (v: unknown): v is BaselineV1 => {
    if (!object(v) || !isDraft(v.setup) || !date(v.completedAt) || !object(v.result)) return false;
    const result = v.result;
    return ['wins', 'draws', 'losses'].every(key => count(result[key])) &&
        ['winRate', 'attackerMean', 'defenderMean'].every(key => number(result[key])) &&
        Number(result.winRate) <= 100 && Number(result.wins) + Number(result.draws) + Number(result.losses) > 0;
};

export const captureDraft = (state: Pick<AppState, 'attackers' | 'defenders' | 'unit' | 'attackerStructure' | 'defenderStructure' | 'battleCount'>): DraftV1 => {
    const unit = (value: AppState['unit']): UnitV1 => ({
        id: value.id,
        name: value.name,
        combatSpell: value.combatSpell || '',
        behind: value.behind,
        items: value.items.map(item => ({id: item.id, abbr: item.abbr || '', name: item.name || '', amount: item.amount})),
        skills: value.skills.map(skill => ({id: skill.id, abbr: skill.abbr || '', name: skill.name || '', level: skill.level, combatSpell: !!skill.combatSpell})),
    });
    return {
        attackers: Object.values(state.attackers).map(unit),
        defenders: Object.values(state.defenders).map(unit),
        editor: unit(state.unit),
        attackerStructure: state.attackerStructure || null,
        defenderStructure: state.defenderStructure || null,
        simulationCount: state.battleCount,
    };
};

export const restoreDraft = (draft: DraftV1): AppState => {
    let state = reducer(undefined, resetState());
    draft.attackers.forEach(unit => { state = reducer(state, addUnit('attackers', unit)); });
    draft.defenders.forEach(unit => { state = reducer(state, addUnit('defenders', unit)); });
    return {
        ...state,
        unit: draft.editor,
        attackerStructure: draft.attackerStructure,
        defenderStructure: draft.defenderStructure,
        battleCount: draft.simulationCount,
    };
};

export const completedRun = (setup: DraftV1, response: ServerSimulationResponse): BaselineV1 => ({
    setup,
    completedAt: new Date().toISOString(),
    result: {
        wins: response.wins,
        draws: response.draws,
        losses: response.loses,
        winRate: response.winRatio,
        attackerMean: response.attackerLooses.mean,
        defenderMean: response.defenderLooses.mean,
    },
});

// The initial release supports V1. Future migrations belong here and must keep the V1 fixtures passing.
export function decodeRecord<T>(raw: string, validate: (value: unknown) => value is T): T {
    const envelope: unknown = JSON.parse(raw);
    if (!object(envelope) || envelope.schemaVersion !== 1 || !date(envelope.savedAt) || !validate(envelope.data)) {
        throw new Error('Unsupported or damaged saved data');
    }
    return envelope.data;
}

export class StoredRecord<T> {
    private previous: string | null;
    private blocked = false;
    value?: T;
    warning = '';

    constructor(private storage: () => StoragePort, private key: string, private validate: (value: unknown) => value is T) {
        try {
            this.previous = storage().getItem(key);
            if (this.previous !== null) this.value = decodeRecord(this.previous, validate);
        } catch (error) {
            this.blocked = true;
            this.warning = 'Saved data could not be loaded. It has been kept untouched; saving this record is paused.';
        }
    }

    save(value: T): boolean {
        if (this.blocked) return false;
        try {
            if (!this.validate(value)) throw new Error('Invalid data');
            if (this.storage().getItem(this.key) !== this.previous) {
                this.blocked = true;
                throw new Error('Another tab changed this record');
            }
            const next = JSON.stringify({schemaVersion: 1, savedAt: new Date().toISOString(), data: value});
            this.storage().setItem(this.key, next);
            this.previous = next;
            this.value = value;
            this.warning = '';
            return true;
        } catch (error) {
            this.warning = 'Could not save in this browser. Existing saved data is untouched. Check browser storage or reload if another tab changed it.';
            return false;
        }
    }

    remove(): boolean {
        if (this.blocked) return false;
        try {
            if (this.storage().getItem(this.key) !== this.previous) {
                this.blocked = true;
                throw new Error('Another tab changed this record');
            }
            this.storage().removeItem(this.key);
            this.previous = null;
            this.value = undefined;
            this.warning = '';
            return true;
        } catch (error) {
            this.warning = 'Could not remove the saved baseline. It has been kept; check browser storage or reload if another tab changed it.';
            return false;
        }
    }
}
