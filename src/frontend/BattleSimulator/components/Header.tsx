import React, {ChangeEvent, FC, useCallback} from 'react';
import {IconButton, Toolbar, Tooltip, Typography} from '@material-ui/core';

import {StyledAppBar} from '../../StyledComponents';
import {
    ExportItem,
    ExportJson,
    ExportSide,
    ExportSkill,
    ExportStructure,
    ExportUnit,
    Item,
    LegacyExportItem,
    LegacyExportJson,
    LegacyExportSkill,
    LegacyExportUnit,
    Side,
    Skill,
    Unit,
} from '../types';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';

import {selectAttackersWithStructures} from './selectors';
import {convertCurrentStateToJson} from './transformers';
import {download} from '../utils';
import {defaultUnit} from '../reducer';
import {v4 as uuidv4} from 'uuid';
import {getItemByAbbr, getSkillByAbbr} from '../resources';
import {addUnit, resetState, setAttackersStructure, setDefendersStructure, setError} from '../actions/simulatorActions';
import {useAppDispatch, useAppSelector} from '../store';

const isLegacyExportJson = (input: ExportJson | LegacyExportJson): input is LegacyExportJson => {
    const sides = [input.attackers, input.defenders];
    return sides.some((side) => {
        if (!side || typeof side !== 'object') {
            return false;
        }
        // Legacy format had `structure` (singular). New format uses `structures` (array).
        if ('structure' in side) {
            return true;
        }
        if (!Array.isArray(side.units)) {
            return false;
        }
        return side.units.some((unit: ExportUnit | LegacyExportUnit) => {
            if (Array.isArray(unit.flags)) return true;
            if (Array.isArray(unit.skills)) return true;
            if (typeof (unit as LegacyExportUnit).combatSpell === 'string') return true;
            if (unit.items && (unit.items as LegacyExportItem[]).some((i) => 'abbr' in i)) return true;
            return false;
        });
    });
};

const normalizeLegacyUnit = (unit: LegacyExportUnit): ExportUnit => {
    const normalized: ExportUnit = {
        name: unit.name,
        items: (unit.items || []).map((item) => ({tag: item.abbr, amount: item.amount})),
    };

    if (Array.isArray(unit.skills) && unit.skills.length) {
        normalized.skills = {
            known: unit.skills.map((skill: LegacyExportSkill) => ({tag: skill.abbr, level: skill.level})),
        };
    }

    if (unit.combatSpell) {
        normalized.combat_spell = {tag: unit.combatSpell};
    }

    if (Array.isArray(unit.flags) && unit.flags.includes('behind')) {
        normalized.flags = {behind: true};
    }

    return normalized;
};

const normalizeLegacy = (input: LegacyExportJson): ExportJson => {
    const buildSide = (side: LegacyExportJson['attackers']): ExportSide => {
        const units = (side.units || []).map(normalizeLegacyUnit);
        if (side.structure && side.structure.type) {
            return {structures: [{type: side.structure.type, units}]};
        }
        return {units};
    };

    return {
        attackers: buildSide(input.attackers),
        defenders: buildSide(input.defenders),
    };
};

const collectSideUnits = (side: ExportSide): {units: ExportUnit[], structureType?: string} => {
    const units: ExportUnit[] = [];
    let structureType: string | undefined;

    if (Array.isArray(side.units)) {
        units.push(...side.units);
    }

    if (Array.isArray(side.structures)) {
        for (const structure of side.structures as ExportStructure[]) {
            if (structure && Array.isArray(structure.units)) {
                units.push(...structure.units);
            }
            if (structure && structure.type && !structureType) {
                structureType = structure.type;
            }
        }
    }

    return {units, structureType};
};

const validateExportJson = (input: ExportJson): boolean => {
    const validSide = (side: ExportSide): boolean => {
        if (!side || typeof side !== 'object') return false;
        if (side.units !== undefined && !Array.isArray(side.units)) return false;
        if (side.structures !== undefined && !Array.isArray(side.structures)) return false;
        return Array.isArray(side.units) || Array.isArray(side.structures);
    };

    return validSide(input.attackers) && validSide(input.defenders);
};

export const Header: FC = () => {
    const {attackers, defenders, defenderStructure, attackerStructure} = useAppSelector(selectAttackersWithStructures);
    const dispatch = useAppDispatch();

    const downloadAsJson = useCallback(() => {
        const exportJson = convertCurrentStateToJson({
            attackers: attackers,
            defenders: defenders,
            defenderStructure: defenderStructure,
            attackerStructure: attackerStructure,
        });

        download(JSON.stringify(exportJson), 'battle.json');
    }, [attackers, defenders, defenderStructure, attackerStructure]);

    const convertJsonToCurrentState = useCallback((inputJson: ExportJson): void => {
        dispatch(resetState());

        const addUnitToState = (side: Side, jsonUnit: ExportUnit): void => {
            const unit: Unit = {...defaultUnit};
            unit.id = uuidv4();
            if (jsonUnit.name) {
                unit.name = jsonUnit.name;
            }

            const combatSpellTag = jsonUnit.combat_spell ? jsonUnit.combat_spell.tag : '';
            if (combatSpellTag) {
                unit.combatSpell = combatSpellTag;
            }

            if (jsonUnit.flags && jsonUnit.flags.behind) {
                unit.behind = true;
            }

            const knownSkills = jsonUnit.skills && Array.isArray(jsonUnit.skills.known)
                ? jsonUnit.skills.known
                : [];

            unit.skills = knownSkills.reduce((list: Skill[], skill: ExportSkill): Skill[] => {
                const skillData = getSkillByAbbr(skill.tag);
                // Ignoring skills that we don't recognize
                if (!skillData) {
                    return list;
                }

                list.push({
                    abbr: skill.tag,
                    level: skill.level,
                    id: uuidv4(),
                    combatSpell: combatSpellTag === skill.tag,
                    name: skillData.name,
                });

                return list;
            }, []);

            if (Array.isArray(jsonUnit.items)) {
                unit.items = jsonUnit.items.reduce((list: Item[], item: ExportItem): Item[] => {
                    const itemData = getItemByAbbr(item.tag);
                    // Ignoring items that we don't recognize as items usable for battle
                    if (!itemData) {
                        return list;
                    }
                    list.push({
                        abbr: item.tag,
                        amount: item.amount,
                        id: uuidv4(),
                        name: itemData.name,
                    });

                    return list;
                }, []);
            }

            dispatch(addUnit(side, unit));
        };

        const attackerSide = collectSideUnits(inputJson.attackers);
        const defenderSide = collectSideUnits(inputJson.defenders);

        attackerSide.units.forEach((jsonUnit) => addUnitToState('attackers', jsonUnit));
        defenderSide.units.forEach((jsonUnit) => addUnitToState('defenders', jsonUnit));

        if (attackerSide.structureType) {
            dispatch(setAttackersStructure(attackerSide.structureType));
        }

        if (defenderSide.structureType) {
            dispatch(setDefendersStructure(defenderSide.structureType));
        }
    }, [dispatch]);

    const uploadJson = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
        if (!event.target.files.length) {
            return;
        }

        const reader = new FileReader();
        reader.readAsText(event.target.files[0]);
        reader.onload = (e): void => {
            let parsed: ExportJson | LegacyExportJson;
            try {
                parsed = JSON.parse(String(e.target.result));
            } catch (e) {
                console.log('failed parsing', e);
                dispatch(setError(true, 'Failed to parse the json, check json formatting!'));
                return;
            }

            if (!parsed || typeof parsed !== 'object' || !parsed.attackers || !parsed.defenders) {
                dispatch(setError(true, 'Invalid json format, missing attackers or defenders!'));
                return;
            }

            const normalized: ExportJson = isLegacyExportJson(parsed)
                ? normalizeLegacy(parsed as LegacyExportJson)
                : (parsed as ExportJson);

            if (!validateExportJson(normalized)) {
                dispatch(setError(true, 'Invalid json format, each side must define units or structures!'));
                return;
            }

            convertJsonToCurrentState(normalized);
        };
    }, [convertJsonToCurrentState]);

    return (
        <StyledAppBar position="static">
            <Toolbar>
                <Typography variant="h6">
                    Atlantis Battle simulator
                </Typography>
                <div style={{flexGrow: 1}}/>
                <input onChange={uploadJson} accept="application/JSON" style={{display: 'none'}} data-testid="json-upload-input" id="icon-button-file" type="file" />
                <label htmlFor="icon-button-file">
                    <IconButton edge="end" color="inherit" component="span">
                        <Tooltip title="Upload battle as a JSON file"><CloudUploadIcon /></Tooltip>
                    </IconButton>
                </label>
                <IconButton edge="end" color="inherit">
                    <Tooltip title="Download battle as a JSON file"><CloudDownloadIcon data-testid="download-json" onClick={downloadAsJson}/></Tooltip>
                </IconButton>
            </Toolbar>
        </StyledAppBar>
    );
};
