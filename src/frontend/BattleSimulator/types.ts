export const SAVE_UNIT = 'SAVE_UNIT';
export const ADD_UNIT = 'ADD_UNIT';
export const ADD_SKILL = 'ADD_SKILL';
export const ADD_ITEM = 'ADD_ITEM';

export const RESET_FORM = 'RESET_FORM';
export const RESET_STATE = 'RESET_STATE';
export const RESET_SIDE = 'RESET_SIDE';

export const CHANGE_ITEM_ABBR = 'CHANGE_ITEM_ABBR';
export const CHANGE_ITEM_AMOUNT = 'CHANGE_ITEM_AMOUNT';

export const CHANGE_SKILL_ABBR = 'CHANGE_SKILL_ABBR';
export const CHANGE_SKILL_LEVEL = 'CHANGE_SKILL_LEVEL';

export const SET_BEHIND = 'SET_BEHIND';
export const SET_LINE = 'SET_LINE';
export const SET_UNITS_NAME = 'SET_UNITS_NAME';
export const SET_COMBAT_SPELL = 'SET_COMBAT_SPELL';

export const EDIT_UNIT = 'EDIT_UNIT';
export const DUPLICATE_UNIT = 'DUPLICATE_UNIT';
export const DUPLICATE_UNIT_TO_OTHER_SIDE = 'DUPLICATE_UNIT_TO_OTHER_SIDE';
export const DELETE_UNIT = 'DELETE_UNIT';

export const SET_LOADING_STATUS = 'SET_LOADING_STATUS';

export const SET_ATTACKERS_STRUCTURE = 'SET_ATTACKERS_STRUCTURE';
export const SET_DEFENDERS_STRUCTURE = 'SET_DEFENDERS_STRUCTURE';

export const SET_ERROR = 'SET_ERROR';

export const OPEN_SETTINGS = 'OPEN_SETTINGS';
export const CLOSE_SETTINGS = 'CLOSE_SETTINGS';

export const SET_BATTLE_COUNT = 'SET_BATTLE_COUNT';

export type Side = 'attackers' | 'defenders';

export type Skill = {
    id: string
    abbr: string
    name: string
    combatSpell: boolean
    level: number
}

export type Item = {
    id: string
    abbr: string
    name: string
    amount: number
}

export type SkillResource = {
    abbr: string
    name: string
    combatSpell?: boolean
}

export type ItemResource = {
    abbr: string
    name: string
}

export type Unit = {
    id: string
    name: string
    skills: Skill[]
    items: Item[]
    combatSpell: string
    behind: boolean
};

export type SideStats = {
    total: number
    front: number
    back: number
}

export type AppState = {
    attackers: {
        [key: string]: Unit
    }
    defenders: {
        [key: string]: Unit
    }
    attackerStructure: string
    defenderStructure: string
    attackerStats: SideStats
    defenderStats: SideStats
    unit: Unit
    loading: boolean
    error: {
        open: boolean
        text: string
    }
    battleCount: number
    settingsWindowOpen: boolean
}

export interface StatRecord {
    min: number
    max: number
    range: number
    occurance: number
    mean: number
    median: number
    mode: number
    percentile: number[]
    stdDev: number
}

export interface ItemStatRecord extends StatRecord {
    item: string
}

export type ServerSimulationResponse = {
    wins: number
    loses: number
    draws: number
    winRatio: number
    victoryBattleText? : string
    lossBattleText? : string
    drawBattleText? : string
    attackerLooses: StatRecord
    defenderLooses: StatRecord
    spoils: ItemStatRecord[]
}

type flags = 'behind';

export type ExportSkill = {
    abbr: string
    level: number
}

export type ExportItem = {
    abbr: string
    amount: number
}

export type ExportUnit = {
    name: string
    skills: ExportSkill[]
    items: ExportItem[]
    combatSpell?: string
    flags?: flags[]
}

export type Structure = {
    type: string
}

export type ExportJson = {
    attackers: {
        units: ExportUnit[]
        structure?: Structure
    }
    defenders: {
        units: ExportUnit[]
        structure?: Structure
    }
}

export type SaveUnit = {
    type: typeof SAVE_UNIT
    payload: {
        side?: Side
    }
}

export type SetLoadingStatus = {
    type: typeof SET_LOADING_STATUS
    payload: {
        status: boolean
    }
}

type AddSkillAction = {
    type: typeof ADD_SKILL
    payload: Record<string, never>
}

type AddItemAction = {
    type: typeof ADD_ITEM
    payload: Record<string, never>
}

type ChangeItemAbbr = {
    type: typeof CHANGE_ITEM_ABBR
    payload: {
        id: string
        abbr: string
        name: string
    }
}

type ChangeItemAmount = {
    type: typeof CHANGE_ITEM_AMOUNT
    payload: {
        id: string
        amount: number
    }
}

type ChangeSkillAbbr = {
    type: typeof CHANGE_SKILL_ABBR
    payload: {
        id: string
        abbr: string
        name: string
        combatSpell: boolean
    }
}

type ChangeSkillLevel = {
    type: typeof CHANGE_SKILL_LEVEL
    payload: {
        id: string
        level: number
    }
}

type SetBehind = {
    type: typeof SET_BEHIND
    payload: {
        enabled: boolean
    }
}

type SetLine = {
    type: typeof SET_LINE
    payload: {
        id: string
        behind: boolean
    }
}

type ResetForm = {
    type: typeof RESET_FORM
    payload: Record<string, never>
}

type ResetState = {
    type: typeof RESET_STATE
    payload: Record<string, never>
}

type ResetSide = {
    type: typeof RESET_SIDE
    payload: {
        side: Side
    }
}

type SetUnitsName = {
    type: typeof SET_UNITS_NAME
    payload: {
        name: string
    }
}

type EditUnit = {
    type: typeof EDIT_UNIT
    payload: {
        id: string
    }
}

type DuplicateUnit = {
    type: typeof DUPLICATE_UNIT
    payload: {
        id: string
    }
}

type DuplicateUnitToOtherSide = {
    type: typeof DUPLICATE_UNIT_TO_OTHER_SIDE
    payload: {
        id: string
    }
}

type DeleteUnit = {
    type: typeof DELETE_UNIT
    payload: {
        id: string
    }
}

type SetCombatSpell = {
    type: typeof SET_COMBAT_SPELL
    payload: {
        abbr: string
    }
}

type AddUnit = {
    type: typeof ADD_UNIT
    payload: {
        side: Side
        unit: Unit
    }
}

type SetError = {
    type: typeof SET_ERROR
    payload: {
        open: boolean
        text: string
    }
}

type SetAttackersStructure = {
    type: typeof SET_ATTACKERS_STRUCTURE
    payload: {
        name: string
    }
}

type SetDefendersStructure = {
    type: typeof SET_DEFENDERS_STRUCTURE
    payload: {
        name: string
    }
}

type OpenSettings = {
    type: typeof OPEN_SETTINGS
}

type CloseSettings = {
    type: typeof CLOSE_SETTINGS
}

type SetBattleCount = {
    type: typeof SET_BATTLE_COUNT
    payload: {
        value: number
    }
}

export type ActionTypes = SaveUnit | AddItemAction | AddSkillAction | ChangeItemAbbr | ChangeItemAmount |
    ChangeSkillAbbr | ChangeSkillLevel | SetBehind | ResetForm | SetUnitsName | EditUnit | DeleteUnit | DuplicateUnit |
    SetCombatSpell | AddUnit | ResetState | SetLoadingStatus | SetError | ResetSide | SetAttackersStructure | SetDefendersStructure |
    DuplicateUnitToOtherSide | OpenSettings | CloseSettings | SetBattleCount | SetLine;
