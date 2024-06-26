/* global fetch, FileReader */
import React, {ChangeEvent, PureComponent, ReactNode} from 'react';
import {connect} from 'react-redux';
import styled from 'styled-components';
import {
    Container,
    Typography,
    IconButton,
    Toolbar,
    Grid,
    Button,
    Tooltip,
    CircularProgress,
    Snackbar,
    InputLabel,
    TextField,
} from '@material-ui/core';
import MuiAlert from '@material-ui/lab/Alert';
import {StylesProvider} from '@material-ui/core/styles';
import LaunchIcon from '@material-ui/icons/Launch';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import GitHubIcon from '@material-ui/icons/GitHub';
import {Dispatch} from 'redux';
import DeleteIcon from '@material-ui/icons/Delete';
import {v4 as uuidv4} from 'uuid';

import {StyledAppBar, StyledPaper, theme, StyledSideHeading} from './StyledComponents';
import {MainForm} from './MainForm';
import {UnitList} from './UnitList';
import {defaultUnit} from './reducer';
import {download} from './utils';
import {
    AppState,
    EDIT_UNIT,
    DELETE_UNIT,
    DUPLICATE_UNIT,
    Unit,
    Side,
    ADD_UNIT,
    RESET_STATE,
    ExportJson,
    ExportUnit,
    ExportItem,
    ExportSkill,
    SET_LOADING_STATUS,
    SET_ERROR,
    RESET_SIDE,
    Skill,
    Item,
    SET_ATTACKERS_STRUCTURE,
    SET_DEFENDERS_STRUCTURE,
    ServerSimulationResponse,
} from './types';
import {getItemByAbbr, getSkillByAbbr, ObjectListSorted} from './resources';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {SimulationResult} from './SimulationResult';

const RunBattleContainer = styled.div`
  text-align: center; 
  margin-top: ${theme.spacing(2)}px
`;

const SideClearIcon = styled(DeleteIcon)`
    position: absolute;
    top: 10px;
    right: 10px;
`;

const Footer = styled(Typography)`
    text-align: center;
    padding: ${theme.spacing(2)}px 0;
`;

type StateProps = Pick<AppState, 'attackers' | 'defenders' | 'unit' | 'loading' | 'error' | 'attackerStructure' | 'defenderStructure'>
type DispatchProps = {
    editUnit: (id: string) => void
    duplicateUnit: (id: string) => void
    deleteUnit: (id: string) => void
    addUnit: (side: Side, unit: Unit) => void
    resetState: () => void
    resetSide: (side: Side) => void
    setLoadingStatus: (status: boolean) => void
    setError: (open: boolean, text?: string) => void
    setAttackersStructure: (name: string) => void
    setDefendersStructure: (name: string) => void
}
type BattleSimulatorProps = StateProps & DispatchProps;

type BattleSimulatorClassState = {
    battleResult?: ServerSimulationResponse
}

const mapStateToProps = (state: AppState): StateProps => {
    return {
        attackers: state.attackers,
        defenders: state.defenders,
        attackerStructure: state.attackerStructure,
        defenderStructure: state.defenderStructure,
        unit: state.unit,
        loading: state.loading,
        error: state.error,
    };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
    editUnit(id): void {
        dispatch({
            type: EDIT_UNIT,
            payload: {
                id,
            },
        });
    },
    duplicateUnit(id): void {
        dispatch({
            type: DUPLICATE_UNIT,
            payload: {
                id,
            },
        });
    },
    deleteUnit(id): void {
        dispatch({
            type: DELETE_UNIT,
            payload: {
                id,
            },
        });
    },
    addUnit(side, unit): void {
        dispatch({
            type: ADD_UNIT,
            payload: {
                side,
                unit,
            },
        });
    },
    resetState(): void {
        dispatch({
            type: RESET_STATE,
        });
    },

    resetSide(side): void {
        dispatch({
            type: RESET_SIDE,
            payload: {
                side,
            },
        });
    },
    setLoadingStatus(status): void {
        dispatch({
            type: SET_LOADING_STATUS,
            payload: {
                status,
            },
        });
    },

    setError(open, text): void {
        dispatch({
            type: SET_ERROR,
            payload: {
                open,
                text,
            },
        });
    },

    setAttackersStructure(name): void {
        dispatch({
            type: SET_ATTACKERS_STRUCTURE,
            payload: {
                name,
            },
        });
    },

    setDefendersStructure(name): void {
        dispatch({
            type: SET_DEFENDERS_STRUCTURE,
            payload: {
                name,
            },
        });
    },
});

export class BattleSimulatorClass extends PureComponent<BattleSimulatorProps, BattleSimulatorClassState> {
    constructor(props: BattleSimulatorProps) {
        super(props);

        this.state = {};
    }

    convertCurrentStateToJson = (): ExportJson => {
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

        for (const id in this.props.attackers) {
            const unit = this.props.attackers[id];
            addUnitToJson('attackers', unit);
        }

        for (const id in this.props.defenders) {
            const unit = this.props.defenders[id];
            addUnitToJson('defenders', unit);
        }

        if (this.props.attackerStructure) {
            exportJson.attackers.structure = {
                type: this.props.attackerStructure,
            };
        }

        if (this.props.defenderStructure) {
            exportJson.defenders.structure = {
                type: this.props.defenderStructure,
            };
        }

        return exportJson;
    }

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
    }

    runBattle = async(): Promise<void> => {
        this.setState({
            battleResult: undefined,
        });

        const exportJson = this.convertCurrentStateToJson();

        this.props.setLoadingStatus(true);

        const response = await fetch('/battle', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                battle: exportJson,
            }),
        });

        this.props.setLoadingStatus(false);

        if (!response.ok) {
            this.props.setError(true, 'Failed to launch battle, check your input units!');
            return;
        }

        const simulationData: ServerSimulationResponse = await response.json();

        this.setState({
            battleResult: simulationData,
        });

        window.gtag && window.gtag('event', 'success', {
            // eslint-disable-next-line @typescript-eslint/camelcase
            event_category: 'battle',
        });
    };

    downloadAsJson = (): void => {
        const exportJson = this.convertCurrentStateToJson();

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

    OnChangeAttackerStructure = (event: ChangeEvent, value: string): void => {
        this.props.setAttackersStructure(value);
    };

    OnChangeDefenderStructure = (event: ChangeEvent, value: string): void => {
        this.props.setDefendersStructure(value);
    };

    closeError = (): void => {
        this.props.setError(false);
    };

    render(): JSX.Element {
        const {attackers, defenders, attackerStructure, defenderStructure, editUnit, duplicateUnit, deleteUnit, loading, error} = this.props;

        return (
            <StylesProvider injectFirst>
                <Container css="flex-grow: 1;">
                    <StyledAppBar position="static">
                        <Toolbar>
                            <Typography variant="h6">
                                Atlantis Battle simulator
                            </Typography>
                            <div style={{flexGrow: 1}}/>
                            <input onChange={this.uploadJson} accept="application/JSON" style={{display: 'none'}} id="icon-button-file" type="file" />
                            <label htmlFor="icon-button-file">
                                <IconButton edge="end" color="inherit" component="span">
                                    <Tooltip title="Upload battle as a JSON file"><CloudUploadIcon /></Tooltip>
                                </IconButton>
                            </label>
                            <IconButton edge="end" color="inherit">
                                <Tooltip title="Download battle as a JSON file"><CloudDownloadIcon onClick={this.downloadAsJson}/></Tooltip>
                            </IconButton>
                        </Toolbar>
                    </StyledAppBar>
                    <MainForm/>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <StyledPaper square elevation={3}>
                                <StyledSideHeading gutterBottom={true} variant="h5">
                                    Attacker units
                                </StyledSideHeading>
                                <Tooltip title="Clear all units on this side">
                                    <SideClearIcon
                                        css={'cursor: pointer'}
                                        onClick={this.props.resetSide.bind(null, 'attackers')}
                                        fontSize={'small'}
                                    />
                                </Tooltip>
                                <InputLabel shrink>
                                   Structure
                                </InputLabel>
                                <Autocomplete
                                    options={ObjectListSorted}
                                    onChange={this.OnChangeAttackerStructure}
                                    value={attackerStructure}
                                    size={'small'}
                                    renderInput={(params): ReactNode =>
                                        <TextField
                                            {...params}
                                            size="small"
                                            variant="outlined"
                                            css={`margin-bottom: ${theme.spacing(1)}px`}
                                        />
                                    }
                                />
                                <UnitList
                                    units={Object.values(attackers)}
                                    onEdit={editUnit}
                                    onDelete={deleteUnit}
                                    onDuplicate={duplicateUnit}
                                />
                            </StyledPaper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <StyledPaper square elevation={3}>
                                <StyledSideHeading variant="h5">
                                    Defender units
                                </StyledSideHeading>
                                <Tooltip title="Clear all units on this side">
                                    <SideClearIcon
                                        css={'cursor: pointer'}
                                        onClick={this.props.resetSide.bind(null, 'defenders')}
                                        fontSize={'small'}
                                    />
                                </Tooltip>
                                <InputLabel shrink>
                                    Structure
                                </InputLabel>
                                <Autocomplete
                                    options={ObjectListSorted}
                                    onChange={this.OnChangeDefenderStructure}
                                    value={defenderStructure}
                                    size={'small'}
                                    renderInput={(params): ReactNode =>
                                        <TextField
                                            {...params}
                                            size="small"
                                            variant="outlined"
                                            css={`margin-bottom: ${theme.spacing(1)}px`}
                                        />
                                    }
                                />
                                <UnitList
                                    units={Object.values(defenders)}
                                    onEdit={editUnit}
                                    onDelete={deleteUnit}
                                    onDuplicate={duplicateUnit}
                                />
                            </StyledPaper>
                        </Grid>
                    </Grid>

                    <RunBattleContainer>
                        <Button
                            color="primary"
                            size="large"
                            variant="contained"
                            startIcon={!loading && <LaunchIcon />}
                            onClick={this.runBattle}
                        >
                            {loading && <CircularProgress color="inherit" size={24}/>}
                            {!loading && 'Run battle'}
                        </Button>
                    </RunBattleContainer>

                    {this.state.battleResult &&
                        <SimulationResult {...this.state.battleResult} />
                    }
                </Container>
                <Footer variant="body2">
                    Copyright © Raivis Gelsbergs 2020. <br/>You can report bugs in <a target="_blank" href="https://github.com/gelzis/atlantis-battle-simulator">Github</a> and/or contact me on <a href="https://discord.gg/HusGETf">discord</a>, my name tag is Gelzis#9633. <br/>
                    <a style={{color: '#000000'}} target="_blank" href="https://github.com/gelzis/atlantis-battle-simulator">
                        <GitHubIcon color="inherit"/>
                    </a>
                </Footer>

                <Snackbar anchorOrigin={{vertical: 'top', horizontal: 'center'}} open={error.open} autoHideDuration={6000} onClose={this.closeError}>
                    <MuiAlert elevation={6} variant="filled" onClose={this.closeError} severity="error">
                        {error.text}
                    </MuiAlert>
                </Snackbar>
            </StylesProvider>
        );
    }
}

export const BattleSimulator = connect(mapStateToProps, mapDispatchToProps)(BattleSimulatorClass);
