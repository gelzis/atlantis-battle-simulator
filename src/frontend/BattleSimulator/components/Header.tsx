import React, {ChangeEvent, PureComponent} from 'react';
import {IconButton, Toolbar, Tooltip, Typography} from '@material-ui/core';

import {StyledAppBar} from '../../StyledComponents';
import {
    AppState, ExportItem,
    ExportJson,
    ExportSkill,
    ExportUnit,
    Item,
    Side,
    Skill,
    Unit,
} from '../types';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import {bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import {convertCurrentStateToJson} from './selectors';
import {download} from '../utils';
import {defaultUnit} from '../reducer';
import {v4 as uuidv4} from 'uuid';
import {getItemByAbbr, getSkillByAbbr} from '../resources';
import {addUnit, resetState, setAttackersStructure, setDefendersStructure, setError} from '../actions/simulatorActions';

type StateProps = Pick<AppState,
    'attackers' |
    'defenders' |
    'attackerStructure' |
    'defenderStructure'
>

const mapStateToProps = (state: AppState): StateProps => ({
    attackers: state.attackers,
    defenders: state.defenders,
    attackerStructure: state.attackerStructure,
    defenderStructure: state.defenderStructure,
});

type DispatchProps = {
    setError: typeof setError
    setAttackersStructure: typeof setAttackersStructure
    setDefendersStructure: typeof setDefendersStructure
    resetState: typeof resetState
    addUnit: typeof addUnit
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => {
    return bindActionCreators({
        addUnit,
        resetState,
        setAttackersStructure,
        setDefendersStructure,
        setError,
    }, dispatch);
};

type Props = DispatchProps & StateProps;

class HeaderClass extends PureComponent<Props> {
    downloadAsJson = (): void => {
        const exportJson = convertCurrentStateToJson({
            attackers: this.props.attackers,
            defenders: this.props.defenders,
            defenderStructure: this.props.defenderStructure,
            attackerStructure: this.props.attackerStructure,
        });

        download(JSON.stringify(exportJson), 'battle.json');
    };

    uploadJson = (event: ChangeEvent<HTMLInputElement>): void => {
        if (!event.target.files.length) {
            return;
        }

        const reader = new FileReader();
        reader.readAsText(event.target.files[0]);
        reader.onload = (e): void => {
            let inputJson;
            try {
                inputJson = JSON.parse(String(e.target.result));
            } catch (e) {
                console.log('failed parsing', e);
                this.props.setError(true, 'Failed to parse the json, check json formatting!');
                return;
            }

            if (!inputJson.attackers || !inputJson.defenders || !Array.isArray(inputJson.attackers.units) || !Array.isArray(inputJson.defenders.units)) {
                this.props.setError(true, 'Invalid json format, missing attackers or defenders array!');
                return;
            }

            this.convertJsonToCurrentState(inputJson);
        };
    };

    convertJsonToCurrentState = (inputJson: ExportJson): void => {
        this.props.resetState();

        const addUnitToState = (side: Side, jsonUnit: ExportUnit): void => {
            const unit: Unit = {...defaultUnit};
            unit.id = uuidv4();
            if (jsonUnit.name) {
                unit.name = jsonUnit.name;
            }

            if (jsonUnit.combatSpell) {
                unit.combatSpell = jsonUnit.combatSpell;
            }

            if (jsonUnit.flags && jsonUnit.flags.includes('behind')) {
                unit.behind = true;
            }

            if (Array.isArray(jsonUnit.skills)) {
                unit.skills = jsonUnit.skills.reduce((list: Skill[], skill: ExportSkill): Skill[] => {
                    const skillData = getSkillByAbbr(skill.abbr);
                    // Ignoring skills that we don't recognize
                    if (!skillData) {
                        return list;
                    }

                    list.push({
                        abbr: skill.abbr,
                        level: skill.level,
                        id: uuidv4(),
                        combatSpell: jsonUnit.combatSpell === skill.abbr,
                        name: skillData.name,
                    });

                    return list;
                }, []);
            }

            if (Array.isArray(jsonUnit.items)) {
                unit.items = jsonUnit.items.reduce((list: Item[], item: ExportItem): Item[] => {
                    const itemData = getItemByAbbr(item.abbr);
                    // Ignoring items that we don't recognize as items usable for battle
                    if (!itemData) {
                        return list;
                    }
                    list.push({
                        abbr: item.abbr,
                        amount: item.amount,
                        id: uuidv4(),
                        name: itemData.name,
                    });

                    return list;
                }, []);
            }

            this.props.addUnit(side, unit);
        };

        if (inputJson.attackers.units.length) {
            inputJson.attackers.units.map((jsonUnit: ExportUnit) => {
                addUnitToState('attackers', jsonUnit);
            });
        }

        if (inputJson.defenders.units.length) {
            inputJson.defenders.units.map((jsonUnit: ExportUnit) => {
                addUnitToState('defenders', jsonUnit);
            });
        }

        if (inputJson.attackers.structure) {
            this.props.setAttackersStructure(inputJson.attackers.structure.type);
        }

        if (inputJson.defenders.structure) {
            this.props.setDefendersStructure(inputJson.attackers.structure.type);
        }
    };

    render() {
        return (
            <StyledAppBar position="static">
                <Toolbar>
                    <Typography variant="h6">
                        Atlantis Battle simulator
                    </Typography>
                    <div style={{flexGrow: 1}}/>
                    <input onChange={this.uploadJson} accept="application/JSON" style={{display: 'none'}} data-testid="json-upload-input" id="icon-button-file" type="file" />
                    <label htmlFor="icon-button-file">
                        <IconButton edge="end" color="inherit" component="span">
                            <Tooltip title="Upload battle as a JSON file"><CloudUploadIcon /></Tooltip>
                        </IconButton>
                    </label>
                    <IconButton edge="end" color="inherit">
                        <Tooltip title="Download battle as a JSON file"><CloudDownloadIcon data-testid="download-json" onClick={this.downloadAsJson}/></Tooltip>
                    </IconButton>
                </Toolbar>
            </StyledAppBar>
        );
    }
}

export const Header = connect(mapStateToProps, mapDispatchToProps)(HeaderClass);
