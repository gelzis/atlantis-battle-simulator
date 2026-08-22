import {BattleStore, canonicalBattleJson} from './battleStore';

describe('BattleStore', () => {
    let store: BattleStore;

    beforeEach(async() => {
        store = new BattleStore(':memory:');
        await store.initialize();
    });

    afterEach(async() => {
        await store.close();
    });

    it('returns the same id when the same battle is saved more than once', async() => {
        const battle = {attackers: {units: [{name: 'A'}]}, defenders: {units: [{name: 'D'}]}};

        const first = await store.save(battle);
        const second = await store.save(battle);

        expect(second.id).toBe(first.id);
        await expect(store.get(first.id)).resolves.toEqual(first);
    });

    it('ignores object key order when identifying a battle', async() => {
        const first = await store.save({attackers: {units: []}, defenders: {units: []}});
        const second = await store.save({defenders: {units: []}, attackers: {units: []}});

        expect(second.id).toBe(first.id);
    });

    it('creates a different id when battle content changes', async() => {
        const first = await store.save({attackers: {units: []}, defenders: {units: []}});
        const second = await store.save({attackers: {units: [{name: 'new'}]}, defenders: {units: []}});

        expect(second.id).not.toBe(first.id);
    });
});

describe('canonicalBattleJson', () => {
    it('sorts nested object keys while preserving array order', () => {
        expect(canonicalBattleJson({z: [{b: 2, a: 1}], a: true}))
            .toBe('{"a":true,"z":[{"a":1,"b":2}]}');
    });
});
