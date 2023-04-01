import {
    ADD_ITEM,
    ADD_SKILL,
    AddItem,
    AddSkill,
    CHANGE_ITEM_ABBR,
    CHANGE_ITEM_AMOUNT,
    CHANGE_SKILL_ABBR,
    CHANGE_SKILL_LEVEL,
    ChangeItemAbbr,
    ChangeItemAmount,
    ChangeSkillAbbr,
    ChangeSkillLevel,
    RESET_FORM,
    ResetForm,
    SAVE_UNIT,
    SaveUnit,
    SET_BEHIND, SET_COMBAT_SPELL, SET_UNITS_NAME,
    SetBehind, SetCombatSpell, SetUnitsName,
    Side,
} from '../types';

export function saveUnit(side?: Side): SaveUnit {
    return {
        type: SAVE_UNIT,
        payload: {
            side,
        },
    };
}

export function addItem(): AddItem {
    return {
        type: ADD_ITEM,
    };
}

export function addSkill(): AddSkill {
    return {
        type: ADD_SKILL,
    };
}

export function changeItemAbbr(id: string, abbr: string, name: string): ChangeItemAbbr {
    return {
        type: CHANGE_ITEM_ABBR,
        payload: {
            id,
            abbr,
            name,
        },
    };
}

export function changeItemAmount(id: string, amount: number): ChangeItemAmount {
    return {
        type: CHANGE_ITEM_AMOUNT,
        payload: {
            id,
            amount,
        },
    };
}

export function changeSkillAbbr(id: string, abbr: string, name: string, combatSpell: boolean): ChangeSkillAbbr {
    return {
        type: CHANGE_SKILL_ABBR,
        payload: {
            id,
            abbr,
            name,
            combatSpell,
        },
    };
}

export function changeSkillLevel(skillId: string, level: number): ChangeSkillLevel {
    return {
        type: CHANGE_SKILL_LEVEL,
        payload: {
            skillId,
            level,
        },
    };
}

export function setBehind(enabled: boolean): SetBehind {
    return {
        type: SET_BEHIND,
        payload: {
            enabled,
        },
    };
}

export function resetForm(): ResetForm {
    return {
        type: RESET_FORM,
    };
}

export function setUnitsName(name: string): SetUnitsName {
    return {
        type: SET_UNITS_NAME,
        payload: {
            name,
        },
    };
}

export function setCombatSpell(abbr: string): SetCombatSpell {
    return {
        type: SET_COMBAT_SPELL,
        payload: {
            abbr,
        },
    };
}
