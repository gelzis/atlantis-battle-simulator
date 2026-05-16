import {AppState, ExportJson, ExportSide, ExportUnit, Unit} from '../types';

type ConvertCurrentStateToJsonParams = Pick<AppState,
    'attackers' |
    'defenders' |
    'attackerStructure' |
    'defenderStructure'
>

const buildExportUnit = (unit: Unit): ExportUnit => {
    const exportUnit: ExportUnit = {
        name: unit.name,
        items: unit.items.map((item) => ({
            tag: item.abbr,
            amount: item.amount,
        })),
    };

    if (unit.skills.length) {
        exportUnit.skills = {
            known: unit.skills.map((skill) => ({
                tag: skill.abbr,
                level: skill.level,
            })),
        };
    }

    if (unit.combatSpell) {
        exportUnit.combat_spell = {tag: unit.combatSpell};
    }

    if (unit.behind) {
        exportUnit.flags = {behind: true};
    }

    return exportUnit;
};

const buildSide = (units: Unit[], structureType: string): ExportSide => {
    const exportUnits = units.map(buildExportUnit);

    if (structureType) {
        return {
            structures: [{
                type: structureType,
                units: exportUnits,
            }],
        };
    }

    return {
        units: exportUnits,
    };
};

export const convertCurrentStateToJson = ({attackers, defenders, defenderStructure, attackerStructure}: ConvertCurrentStateToJsonParams): ExportJson => {
    const attackerUnits = Object.keys(attackers).map((id) => attackers[id]);
    const defenderUnits = Object.keys(defenders).map((id) => defenders[id]);

    return {
        attackers: buildSide(attackerUnits, attackerStructure),
        defenders: buildSide(defenderUnits, defenderStructure),
    };
};
