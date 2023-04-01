import {
    ADD_UNIT,
    AddUnit,
    CLOSE_SETTINGS,
    CloseSettings,
    DELETE_UNIT,
    DeleteUnit,
    DUPLICATE_UNIT,
    DUPLICATE_UNIT_TO_OTHER_SIDE,
    DuplicateUnit,
    DuplicateUnitToOtherSide,
    EDIT_UNIT,
    EditUnit,
    OPEN_SETTINGS,
    OpenSettings,
    RESET_SIDE,
    RESET_STATE,
    ResetSide,
    ResetState,
    SET_ATTACKERS_STRUCTURE,
    SET_DEFENDERS_STRUCTURE,
    SET_ERROR, SET_LINE,
    SET_LOADING_STATUS,
    SetAttackersStructure,
    SetDefendersStructure,
    SetError, SetLine,
    SetLoadingStatus,
    Side,
    Unit,
} from '../types';

export function editUnit(id: string): EditUnit {
    return {
        type: EDIT_UNIT,
        payload: {
            id,
        },
    };
}

export function resetSide(side: Side): ResetSide {
    return {
        type: RESET_SIDE,
        payload: {
            side,
        },
    };
}

export function setDefendersStructure(name: string): SetDefendersStructure {
    return {
        type: SET_DEFENDERS_STRUCTURE,
        payload: {
            name,
        },
    };
}

export function duplicateUnit(id: string): DuplicateUnit {
    return {
        type: DUPLICATE_UNIT,
        payload: {
            id,
        },
    };
}

export function deleteUnit(id: string): DeleteUnit {
    return {
        type: DELETE_UNIT,
        payload: {
            id,
        },
    };
}

export function addUnit(side: Side, unit: Unit): AddUnit {
    return {
        type: ADD_UNIT,
        payload: {
            side,
            unit,
        },
    };
}

export function resetState(): ResetState {
    return {
        type: RESET_STATE,
    };
}

export function setLoadingStatus(status: boolean): SetLoadingStatus {
    return {
        type: SET_LOADING_STATUS,
        payload: {
            status,
        },
    };
}

export function setError(open: boolean, text?: string): SetError {
    return {
        type: SET_ERROR,
        payload: {
            open,
            text,
        },
    };
}

export function setAttackersStructure(name: string): SetAttackersStructure {
    return {
        type: SET_ATTACKERS_STRUCTURE,
        payload: {
            name,
        },
    };
}

export function duplicateUnitToTheOtherSide(id: string): DuplicateUnitToOtherSide {
    return {
        type: DUPLICATE_UNIT_TO_OTHER_SIDE,
        payload: {
            id,
        },
    };
}

export function openSettings(): OpenSettings {
    return {
        type: OPEN_SETTINGS,
    };
}

export function closeSettings(): CloseSettings {
    return {
        type: CLOSE_SETTINGS,
    };
}

export function setLine(id: string, behind: boolean): SetLine {
    return {
        type: SET_LINE,
        payload: {
            id,
            behind,
        },
    };
}
