import {RootState} from '../store';
import {createSelector} from '@reduxjs/toolkit';

export const selectAttackersWithStructures = createSelector(
    [
        (state: RootState) => state.attackers,
        (state: RootState) => state.defenders,
        (state: RootState) => state.attackerStructure,
        (state: RootState) => state.defenderStructure,
    ],
    (attackers, defenders, attackerStructure, defenderStructure) => ({
        attackers, defenders, attackerStructure, defenderStructure,
    }),
);
