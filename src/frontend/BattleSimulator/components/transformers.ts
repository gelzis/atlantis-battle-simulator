import {AppState, ExportJson, ExportUnit, Side, Unit} from '../types';

type ConvertCurrentStateToJsonParams = Pick<AppState,
    'attackers' |
    'defenders' |
    'attackerStructure' |
    'defenderStructure'
>

export const convertCurrentStateToJson = ({attackers, defenders, defenderStructure, attackerStructure}: ConvertCurrentStateToJsonParams): ExportJson => {
    const exportJson: ExportJson = {
        attackers: {
            units: [],
        },
        defenders: {
            units: [],
        },
    };

    const addUnitToJson = (side: Side, unit: Unit): void => {
        const exportUnit: ExportUnit = {
            name: unit.name,
            skills: [],
            items: [],
        };

        if (unit.behind) {
            exportUnit.flags = ['behind'];
        }

        if (unit.combatSpell) {
            exportUnit.combatSpell = unit.combatSpell;
        }

        for (const skill of unit.skills) {
            exportUnit.skills.push({
                abbr: skill.abbr,
                level: skill.level,
            });
        }

        for (const item of unit.items) {
            exportUnit.items.push({
                abbr: item.abbr,
                amount: item.amount,
            });
        }

        if (side === 'attackers') {
            exportJson.attackers.units.push(exportUnit);
        } else {
            exportJson.defenders.units.push(exportUnit);
        }
    };

    for (const id in attackers) {
        const unit = attackers[id];
        addUnitToJson('attackers', unit);
    }

    for (const id in defenders) {
        const unit = defenders[id];
        addUnitToJson('defenders', unit);
    }

    if (attackerStructure) {
        exportJson.attackers.structure = {
            type: attackerStructure,
        };
    }

    if (defenderStructure) {
        exportJson.defenders.structure = {
            type: defenderStructure,
        };
    }

    return exportJson;
};
