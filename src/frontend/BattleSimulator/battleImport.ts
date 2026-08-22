import {Dispatch} from 'redux';
import {v4 as uuidv4} from 'uuid';

import {addUnit, resetState, setAttackersStructure, setDefendersStructure} from './actions/simulatorActions';
import {defaultUnit} from './reducer';
import {getItemByAbbr, getSkillByAbbr} from './resources';
import {ExportItem, ExportJson, ExportSide, ExportSkill, ExportStructure, ExportUnit, Item, Side, Skill, Unit} from './types';

export const collectSideUnits = (side: ExportSide): {units: ExportUnit[], structureType?: string} => {
    const units: ExportUnit[] = [];
    let structureType: string | undefined;

    if (Array.isArray(side.units)) units.push(...side.units);
    if (Array.isArray(side.structures)) {
        for (const structure of side.structures as ExportStructure[]) {
            if (structure && Array.isArray(structure.units)) units.push(...structure.units);
            if (structure && structure.type && !structureType) structureType = structure.type;
        }
    }

    return {units, structureType};
};

export const loadBattleIntoStore = (inputJson: ExportJson, dispatch: Dispatch): void => {
    dispatch(resetState());

    const addJsonUnit = (side: Side, jsonUnit: ExportUnit): void => {
        const combatSpellTag = jsonUnit.combat_spell ? jsonUnit.combat_spell.tag : '';
        const unit: Unit = {
            ...defaultUnit,
            id: uuidv4(),
            name: jsonUnit.name || defaultUnit.name,
            combatSpell: combatSpellTag,
            behind: !!(jsonUnit.flags && jsonUnit.flags.behind),
            skills: [],
            items: [],
        };

        const knownSkills = jsonUnit.skills && Array.isArray(jsonUnit.skills.known) ? jsonUnit.skills.known : [];
        unit.skills = knownSkills.reduce((list: Skill[], skill: ExportSkill): Skill[] => {
            const skillData = getSkillByAbbr(skill.tag);
            if (skillData) {
                list.push({
                    abbr: skill.tag,
                    level: skill.level,
                    id: uuidv4(),
                    combatSpell: combatSpellTag === skill.tag,
                    name: skillData.name,
                });
            }
            return list;
        }, []);

        unit.items = (jsonUnit.items || []).reduce((list: Item[], item: ExportItem): Item[] => {
            const itemData = getItemByAbbr(item.tag);
            if (itemData) list.push({abbr: item.tag, amount: item.amount, id: uuidv4(), name: itemData.name});
            return list;
        }, []);

        dispatch(addUnit(side, unit));
    };

    const attackers = collectSideUnits(inputJson.attackers);
    const defenders = collectSideUnits(inputJson.defenders);
    attackers.units.forEach((unit) => addJsonUnit('attackers', unit));
    defenders.units.forEach((unit) => addJsonUnit('defenders', unit));
    if (attackers.structureType) dispatch(setAttackersStructure(attackers.structureType));
    if (defenders.structureType) dispatch(setDefendersStructure(defenders.structureType));
};
