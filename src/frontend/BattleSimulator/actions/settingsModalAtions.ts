import {SET_BATTLE_COUNT, SetBattleCount} from '../types';

export function setBattleCount(value: number): SetBattleCount {
    return {
        type: SET_BATTLE_COUNT,
        payload: {
            value,
        },
    };
}
