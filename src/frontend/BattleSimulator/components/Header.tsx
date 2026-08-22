/* global fetch */
import React, {ChangeEvent, FC, useCallback, useState} from 'react';
import {IconButton, Toolbar, Tooltip, Typography} from '@material-ui/core';

import {StyledAppBar} from '../../StyledComponents';
import {
    ExportJson,
    ExportSide,
    ExportUnit,
    LegacyExportItem,
    LegacyExportJson,
    LegacyExportSkill,
    LegacyExportUnit,
} from '../types';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import ShareIcon from '@material-ui/icons/Share';

import {selectAttackersWithStructures} from './selectors';
import {convertCurrentStateToJson} from './transformers';
import {download} from '../utils';
import {setError} from '../actions/simulatorActions';
import {useAppDispatch, useAppSelector} from '../store';
import {loadBattleIntoStore} from '../battleImport';

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
    const [saving, setSaving] = useState(false);

    const downloadAsJson = useCallback(() => {
        const exportJson = convertCurrentStateToJson({
            attackers: attackers,
            defenders: defenders,
            defenderStructure: defenderStructure,
            attackerStructure: attackerStructure,
        });

        download(JSON.stringify(exportJson), 'battle.json');
    }, [attackers, defenders, defenderStructure, attackerStructure]);

    const saveAndShare = useCallback(async(): Promise<void> => {
        const battle = convertCurrentStateToJson({
            attackers,
            defenders,
            defenderStructure,
            attackerStructure,
        });

        setSaving(true);
        try {
            const response = await fetch('/saved-battles', {
                method: 'POST',
                headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                body: JSON.stringify({battle}),
            });
            if (!response.ok) {
                dispatch(setError(true, 'Failed to save the battle.'));
                return;
            }

            const saved: {url: string} = await response.json();
            const savedUrl = new URL(saved.url, window.location.origin).toString();
            window.history.pushState({}, '', saved.url);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(savedUrl).catch(() => undefined);
            }
        } catch (error) {
            dispatch(setError(true, 'Failed to save the battle.'));
        } finally {
            setSaving(false);
        }
    }, [attackers, defenders, defenderStructure, attackerStructure, dispatch]);

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

            loadBattleIntoStore(normalized, dispatch);
        };
    }, [dispatch]);

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
                <IconButton edge="end" color="inherit" disabled={saving} onClick={saveAndShare}>
                    <Tooltip title="Save battle and copy share link"><ShareIcon data-testid="save-and-share"/></Tooltip>
                </IconButton>
            </Toolbar>
        </StyledAppBar>
    );
};
