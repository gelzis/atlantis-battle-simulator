import {collectSideUnits, loadBattleIntoStore} from './battleImport';
import {convertCurrentStateToJson} from './components/transformers';
import {createAppStore} from './store';
import {ExportJson, ExportUnit} from './types';

it('preserves units, skills, spells, flags and both structures through import and export', () => {
    const battle: ExportJson = {
        attackers: {
            structures: [{
                type: 'Tower',
                units: [{
                    name: 'Mages',
                    items: [{tag: 'LEAD', amount: 3}],
                    skills: {known: [{tag: 'FIRE', level: 4}, {tag: 'COMB', level: 2}]},
                    combat_spell: {tag: 'FIRE'},
                    flags: {behind: true},
                }],
            }],
        },
        defenders: {structures: [{type: 'Fort', units: [{name: 'Guards', items: [{tag: 'LEAD', amount: 5}]}]}]},
    };
    const store = createAppStore();

    loadBattleIntoStore(battle, store.dispatch);

    expect(convertCurrentStateToJson(store.getState())).toEqual(battle);
    expect(store.getState().attackerStats).toEqual({front: 0, back: 3, total: 3});
    expect(store.getState().defenderStats).toEqual({front: 5, back: 0, total: 5});
    const mage = Object.values(store.getState().attackers)[0];
    expect(mage.skills).toEqual(expect.arrayContaining([
        expect.objectContaining({abbr: 'FIRE', name: 'fire', combatSpell: true}),
        expect.objectContaining({abbr: 'COMB', name: 'combat', combatSpell: false}),
    ]));
});

it('replaces a previous battle and clears its structures and totals', () => {
    const store = createAppStore();
    loadBattleIntoStore({
        attackers: {structures: [{type: 'Tower', units: [{name: 'Old', items: [{tag: 'LEAD', amount: 10}]}]}]},
        defenders: {structures: [{type: 'Fort', units: []}]},
    }, store.dispatch);
    const replacement: ExportJson = {attackers: {units: []}, defenders: {units: [{name: 'New', items: [{tag: 'LEAD', amount: 2}]}]}};

    loadBattleIntoStore(replacement, store.dispatch);

    expect(convertCurrentStateToJson(store.getState())).toEqual(replacement);
    expect(store.getState().attackerStructure).toBeNull();
    expect(store.getState().defenderStructure).toBeNull();
    expect(store.getState().attackerStats.total).toBe(0);
    expect(store.getState().defenderStats.total).toBe(2);
});

it('skips unknown resources without dropping recognized resources or duplicate units', () => {
    const store = createAppStore();
    const unit = {
        name: '',
        items: [{tag: 'UNKNOWN_ITEM', amount: 100}, {tag: 'LEAD', amount: 2}],
        skills: {known: [{tag: 'UNKNOWN_SKILL', level: 5}, {tag: 'COMB', level: 1}]},
    };
    loadBattleIntoStore({attackers: {units: [unit, unit]}, defenders: {units: []}}, store.dispatch);

    const units = Object.values(store.getState().attackers);
    expect(units).toHaveLength(2);
    expect(units[0].id).not.toBe(units[1].id);
    expect(units[0].items[0].id).not.toBe(units[1].items[0].id);
    expect(units[0].skills[0].id).not.toBe(units[1].skills[0].id);
    expect(units[0].name).toBe('Unit');
    expect(units[0].items.map(item => item.abbr)).toEqual(['LEAD']);
    expect(units[0].skills.map(skill => skill.abbr)).toEqual(['COMB']);
    expect(store.getState().attackerStats.total).toBe(4);
});

it('handles missing item and skill fields in uploaded JSON', () => {
    const store = createAppStore();
    const uploaded: ExportJson = JSON.parse('{"attackers":{"units":[{"name":"Empty"}]},"defenders":{}}');
    loadBattleIntoStore(uploaded, store.dispatch);
    expect(convertCurrentStateToJson(store.getState())).toEqual({
        attackers: {units: [{name: 'Empty', items: []}]}, defenders: {units: []},
    });
});

it('collects loose and garrisoned units in order, using the first structure type', () => {
    const loose: ExportUnit = {name: 'Outside', items: []};
    const tower: ExportUnit = {name: 'Tower guards', items: []};
    const fort: ExportUnit = {name: 'Fort guards', items: []};
    expect(collectSideUnits({
        units: [loose],
        structures: [
            {type: 'Tower', units: [tower]}, {type: 'Fort', units: [fort]},
        ],
    })).toEqual({units: [loose, tower, fort], structureType: 'Tower'});
});
