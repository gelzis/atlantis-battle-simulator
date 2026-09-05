import {createAppStore} from './store';
import {addItem, changeItemAbbr, changeItemAmount, changeSkillAbbr, resetForm, saveUnit, setUnitsName} from './actions/formActions';
import {deleteUnit, duplicateUnit, duplicateUnitToTheOtherSide, editUnit, resetSide, resetState, setLine} from './actions/simulatorActions';
import {Side} from './types';

it('keeps independent stores and preserves unit editing and reset behavior', () => {
    const first = createAppStore();
    const second = createAppStore();
    const previousState = first.getState();

    first.dispatch(saveUnit('attackers'));

    expect(Object.keys(first.getState().attackers)).toHaveLength(1);
    expect(first.getState().attackerStats.total).toBe(1);
    expect(Object.keys(previousState.attackers)).toHaveLength(0);
    expect(Object.keys(second.getState().attackers)).toHaveLength(0);

    first.dispatch(resetState());
    expect(Object.keys(first.getState().attackers)).toHaveLength(0);
});

describe.each<Side>(['attackers', 'defenders'])('%s army editing', side => {
    it('keeps edits isolated until save, and cancels without changing the army', () => {
        const store = createAppStore();
        store.dispatch(saveUnit(side));
        const original = Object.values(store.getState()[side])[0];
        store.dispatch(editUnit(original.id));
        store.dispatch(setUnitsName('Edited'));
        store.dispatch(changeItemAmount(original.items[0].id, 7));
        expect(store.getState()[side][original.id]).toEqual(original);
        store.dispatch(resetForm());
        expect(store.getState()[side][original.id]).toEqual(original);

        store.dispatch(editUnit(original.id));
        store.dispatch(changeItemAmount(original.items[0].id, 3));
        store.dispatch(saveUnit());
        expect(Object.values(store.getState()[side])).toHaveLength(1);
        expect(store.getState()[side][original.id].items[0].amount).toBe(3);
        expect(original.items[0].amount).toBe(1);
    });

    it('duplicates independently on the same and opposite sides', () => {
        const other: Side = side === 'attackers' ? 'defenders' : 'attackers';
        const store = createAppStore();
        store.dispatch(saveUnit(side));
        const original = Object.values(store.getState()[side])[0];
        store.dispatch(duplicateUnit(original.id));
        store.dispatch(duplicateUnitToTheOtherSide(original.id));
        const copy = Object.values(store.getState()[side]).find(unit => unit.id !== original.id);
        const opposite = Object.values(store.getState()[other])[0];
        expect(new Set([original.id, copy.id, opposite.id]).size).toBe(3);

        store.dispatch(editUnit(copy.id));
        store.dispatch(changeItemAmount(copy.items[0].id, 9));
        store.dispatch(saveUnit());
        expect(store.getState()[side][original.id].items[0].amount).toBe(1);
        expect(store.getState()[other][opposite.id].items[0].amount).toBe(1);
        expect(store.getState()[side][copy.id].items[0].amount).toBe(9);
    });

    it('counts soldiers rather than equipment and updates totals on line changes and deletion', () => {
        const store = createAppStore();
        store.dispatch(changeItemAmount(store.getState().unit.items[0].id, 4));
        store.dispatch(addItem());
        const equipmentId = store.getState().unit.items[0].id;
        store.dispatch(changeItemAbbr(equipmentId, 'SWOR', 'sword'));
        store.dispatch(changeItemAmount(equipmentId, 100));
        store.dispatch(saveUnit(side));
        const id = Object.keys(store.getState()[side])[0];
        const stats = () => side === 'attackers' ? store.getState().attackerStats : store.getState().defenderStats;
        expect(stats()).toEqual({front: 4, back: 0, total: 4});
        store.dispatch(setLine(id, true));
        expect(stats()).toEqual({front: 0, back: 4, total: 4});
        store.dispatch(setLine(id, false));
        expect(stats()).toEqual({front: 4, back: 0, total: 4});
        store.dispatch(deleteUnit(id));
        expect(stats()).toEqual({front: 0, back: 0, total: 0});
    });

    it('clears one army without clearing its opponent', () => {
        const store = createAppStore();
        store.dispatch(saveUnit('attackers'));
        store.dispatch(saveUnit('defenders'));
        const other: Side = side === 'attackers' ? 'defenders' : 'attackers';
        const opponent = store.getState()[other];
        store.dispatch(resetSide(side));
        expect(Object.keys(store.getState()[side])).toHaveLength(0);
        expect(store.getState()[other]).toEqual(opponent);
    });
});

it('selects a new combat spell and clears it when that skill is replaced', () => {
    const store = createAppStore();
    const id = store.getState().unit.skills[0].id;
    store.dispatch(changeSkillAbbr(id, 'FIRE', 'fire', true));
    expect(store.getState().unit.combatSpell).toBe('FIRE');
    store.dispatch(changeSkillAbbr(id, 'EQUA', 'earthquake', true));
    expect(store.getState().unit.combatSpell).toBe('EQUA');
    store.dispatch(changeSkillAbbr(id, 'COMB', 'combat', false));
    expect(store.getState().unit.combatSpell).toBe('');
});
