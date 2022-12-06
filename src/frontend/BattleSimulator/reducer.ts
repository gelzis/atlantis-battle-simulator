import produce from 'immer';
import {Reducer} from 'react';
import {v4 as uuidv4} from 'uuid';

import {
    ActionTypes,
    ADD_ITEM,
    ADD_SKILL,
    ADD_UNIT,
    AppState,
    CHANGE_ITEM_ABBR,
    CHANGE_ITEM_AMOUNT,
    CHANGE_SKILL_ABBR,
    CHANGE_SKILL_LEVEL,
    CLOSE_SETTINGS,
    DELETE_UNIT,
    DUPLICATE_UNIT,
    DUPLICATE_UNIT_TO_OTHER_SIDE,
    EDIT_UNIT,
    OPEN_SETTINGS,
    RESET_FORM,
    RESET_SIDE,
    RESET_STATE,
    SAVE_UNIT,
    SET_ATTACKERS_STRUCTURE,
    SET_BATTLE_COUNT,
    SET_BEHIND,
    SET_COMBAT_SPELL,
    SET_DEFENDERS_STRUCTURE,
    SET_ERROR,
    SET_LINE,
    SET_LOADING_STATUS,
    SET_UNITS_NAME,
    SideStats,
    Unit,
} from './types';
import {SoldierItems} from './resources';

export const defaultUnit: Unit = {
    id: '',
    name: 'Unit',
    skills: [
        {id: uuidv4(), abbr: '', combatSpell: false, name: '', level: 1},
    ],
    items: [
        {abbr: 'LEAD', amount: 1, id: uuidv4(), name: 'leader'},
    ],
    combatSpell: '',
    behind: false,
};

const initialState: AppState = {
    attackers: {},
    defenders: {},
    attackerStructure: null,
    defenderStructure: null,
    unit: defaultUnit,
    loading: false,
    battleCount: 50,
    attackerStats: {total: 0, front: 0, back: 0},
    defenderStats: {total: 0, front: 0, back: 0},
    settingsWindowOpen: false,
    error: {
        open: false,
        text: '',
    },
};

function calcTotals(side: { [id: string]: Unit }): SideStats {
    let total = 0;
    let front = 0;
    let back = 0;

    for (const unit of Object.values(side)) {
        for (const item of unit.items) {
            if (SoldierItems.includes(item.abbr)) {
                total += item.amount;
                if (unit.behind) {
                    back += item.amount;
                } else {
                    front += item.amount;
                }
            }
        }
    }

    return {front, back, total};
}

export const reducer: Reducer<AppState, ActionTypes> = produce((state: AppState, action: ActionTypes): AppState | void => {
    switch (action.type) {
        case SAVE_UNIT: {
            state.unit.skills = state.unit.skills.filter((skill) => !!skill.abbr);
            state.unit.items = state.unit.items.filter((item) => !!item.abbr);

            if (!state.unit.items.length) {
                break;
            }

            if (state.unit.id) {
                if (state.attackers[state.unit.id]) {
                    state.attackers[state.unit.id] = state.unit;
                    state.attackerStats = calcTotals(state.attackers);
                } else if (state.defenders[state.unit.id]) {
                    state.defenders[state.unit.id] = state.unit;
                    state.defenderStats = calcTotals(state.defenders);
                }
            } else {
                state.unit.id = uuidv4();
                if (action.payload.side === 'attackers') {
                    state.attackers[state.unit.id] = state.unit;
                    state.attackerStats = calcTotals(state.attackers);
                } else {
                    state.defenders[state.unit.id] = state.unit;
                    state.defenderStats = calcTotals(state.defenders);
                }
            }

            state.unit = defaultUnit;
            break;
        }
        case DUPLICATE_UNIT: {
            if (state.attackers[action.payload.id]) {
                const newUnit = {...state.attackers[action.payload.id]};
                newUnit.id = uuidv4();
                state.attackers[newUnit.id] = newUnit;
                state.attackerStats = calcTotals(state.attackers);
            } else if (state.defenders[action.payload.id]) {
                const newUnit = {...state.defenders[action.payload.id]};
                newUnit.id = uuidv4();
                state.defenders[newUnit.id] = newUnit;
                state.defenderStats = calcTotals(state.defenders);
            }
            break;
        }

        case DUPLICATE_UNIT_TO_OTHER_SIDE: {
            if (state.attackers[action.payload.id]) {
                const newUnit = {...state.attackers[action.payload.id]};
                newUnit.id = uuidv4();
                state.defenders[newUnit.id] = newUnit;
                state.defenderStats = calcTotals(state.defenders);
            } else if (state.defenders[action.payload.id]) {
                const newUnit = {...state.defenders[action.payload.id]};
                newUnit.id = uuidv4();
                state.attackers[newUnit.id] = newUnit;
                state.attackerStats = calcTotals(state.attackers);
            }
            break;
        }
        case DELETE_UNIT: {
            if (state.attackers[action.payload.id]) {
                delete state.attackers[action.payload.id];
                state.attackerStats = calcTotals(state.attackers);
            } else if (state.defenders[action.payload.id]) {
                delete state.defenders[action.payload.id];
                state.defenderStats = calcTotals(state.defenders);
            }
            break;
        }
        case ADD_SKILL: {
            state.unit.skills.unshift({
                id: uuidv4(),
                abbr: '',
                combatSpell: false,
                name: '',
                level: 1,
            });
            break;
        }
        case ADD_ITEM: {
            let amount = 1;

            if (state.unit.items.length) {
                amount = state.unit.items[state.unit.items.length - 1].amount;
            }

            state.unit.items.unshift({
                id: uuidv4(),
                abbr: '',
                name: '',
                amount,
            });

            break;
        }

        case CHANGE_ITEM_ABBR: {
            const item = state.unit.items.find((item) => {
                return item.id === action.payload.id;
            });

            item.abbr = action.payload.abbr;
            item.name = action.payload.name;
            break;
        }

        case CHANGE_ITEM_AMOUNT: {
            const item = state.unit.items.find((item) => {
                return item.id === action.payload.id;
            });

            item.amount = action.payload.amount;
            break;
        }

        case CHANGE_SKILL_ABBR: {
            const skill = state.unit.skills.find((item) => {
                return item.id === action.payload.id;
            });

            if (skill.abbr === state.unit.combatSpell) {
                state.unit.combatSpell = '';
            }

            skill.abbr = action.payload.abbr;
            skill.name = action.payload.name;
            skill.combatSpell = action.payload.combatSpell;

            if (skill.combatSpell && !state.unit.combatSpell) {
                state.unit.combatSpell = skill.abbr;
            }
            break;
        }

        case CHANGE_SKILL_LEVEL: {
            const skill = state.unit.skills.find((item) => {
                return item.id === action.payload.id;
            });

            skill.level = action.payload.level;
            break;
        }

        case SET_UNITS_NAME: {
            state.unit.name = action.payload.name;
            break;
        }

        case SET_BEHIND: {
            state.unit.behind = action.payload.enabled;
            break;
        }

        case SET_LINE: {
            if (state.attackers[action.payload.id]) {
                state.attackers[action.payload.id].behind = action.payload.behind;
                state.attackerStats = calcTotals(state.attackers);
            } else if (state.defenders[action.payload.id]) {
                state.defenders[action.payload.id].behind = action.payload.behind;
                state.defenderStats = calcTotals(state.defenders);
            }
            break;
        }

        case SET_COMBAT_SPELL: {
            state.unit.combatSpell = action.payload.abbr;
            break;
        }

        case EDIT_UNIT: {
            if (state.attackers[action.payload.id]) {
                state.unit = state.attackers[action.payload.id];
            } else if (state.defenders[action.payload.id]) {
                state.unit = state.defenders[action.payload.id];
            }
            break;
        }

        case ADD_UNIT: {
            if (action.payload.side === 'attackers') {
                state.attackers[action.payload.unit.id] = action.payload.unit;
                state.attackerStats = calcTotals(state.attackers);
            } else {
                state.defenders[action.payload.unit.id] = action.payload.unit;
                state.defenderStats = calcTotals(state.defenders);
            }
            break;
        }

        case RESET_FORM: {
            state.unit = defaultUnit;
            break;
        }

        case RESET_SIDE: {
            if (action.payload.side === 'attackers') {
                state.attackers = {};
                state.attackerStats = calcTotals({});
            } else {
                state.defenders = {};
                state.defenderStats = calcTotals({});
            }
            break;
        }

        case RESET_STATE: {
            return initialState;
        }

        case SET_LOADING_STATUS: {
            state.loading = action.payload.status;
            break;
        }

        case SET_ERROR: {
            state.error = {
                open: action.payload.open,
                text: action.payload.text,
            };
            break;
        }

        case SET_ATTACKERS_STRUCTURE: {
            state.attackerStructure = action.payload.name;
            break;
        }

        case SET_DEFENDERS_STRUCTURE: {
            state.defenderStructure = action.payload.name;
            break;
        }

        case OPEN_SETTINGS: {
            state.settingsWindowOpen = true;
            break;
        }

        case CLOSE_SETTINGS: {
            state.settingsWindowOpen = false;
            break;
        }

        case SET_BATTLE_COUNT: {
            state.battleCount = action.payload.value;
            break;
        }
    }
}, initialState);
