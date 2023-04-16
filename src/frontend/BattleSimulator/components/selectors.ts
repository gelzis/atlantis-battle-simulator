import {RootState} from '../store';

export const selectAttackersWithStructures = (state: RootState) => {
    return {
        attackers: state.attackers,
        defenders: state.defenders,
        attackerStructure: state.attackerStructure,
        defenderStructure: state.defenderStructure,
    };
};
