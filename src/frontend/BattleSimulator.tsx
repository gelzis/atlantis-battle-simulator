/* global fetch */
import React, {ChangeEvent, PureComponent} from 'react';
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
} from '@material-ui/core';
import MuiAlert from '@material-ui/lab/Alert';
import {StylesProvider} from '@material-ui/core/styles';
import LaunchIcon from '@material-ui/icons/Launch';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import GitHubIcon from '@material-ui/icons/GitHub';

import {StyledAppBar, StyledPaper, theme} from './StyledComponents';
import {MainForm} from './MainForm';
import {UnitList} from './UnitList';
// import {defaultUnit} from './reducer';
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
    SET_LOADING_STATUS,
    SET_ERROR,
    RESET_SIDE,
} from './types';
import {Dispatch} from 'redux';
import DeleteIcon from '@material-ui/icons/Delete';
// import {json} from 'express';
// import {v4 as uuidv4} from 'uuid';

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
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: ${theme.spacing(2)}px 0;
`;

type StateProps = Pick<AppState, 'attackers' | 'defenders' | 'unit' | 'loading' | 'error'>
type DispatchProps = {
    editUnit: (id: string) => void
    duplicateUnit: (id: string) => void
    deleteUnit: (id: string) => void
    addUnit: (side: Side, unit: Unit) => void
    resetState: () => void
    resetSide: (side: Side) => void
    setLoadingStatus: (status: boolean) => void
    setError: (open: boolean, text?: string) => void
}
type BattleSimulatorProps = StateProps & DispatchProps;

type BattleSimulatorClassState = {
    battleText: string
}

const mapStateToProps = (state: AppState): StateProps => {
    return {
        attackers: state.attackers,
        defenders: state.defenders,
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
});

export class BattleSimulatorClass extends PureComponent<BattleSimulatorProps, BattleSimulatorClassState> {
    constructor(props: BattleSimulatorProps) {
        super(props);

        this.state = {
            battleText: '',
        };
    }

    runBattle = async(): Promise<void> => {
        this.setState({
            battleText: '',
        });

        const exportJson: ExportJson = {
            attackers: [],
            defenders: [],
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
                exportJson.attackers.push(exportUnit);
            } else {
                exportJson.defenders.push(exportUnit);
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

        this.setState({
            battleText: await response.text(),
        });
    };

    // downloadAsJson = () => {
    //     console.log('run battle');
    // };

    uploadJson = (event: ChangeEvent<HTMLInputElement>): void => {
        if (!event.target.files.length) {
            // return;
        }
        //
        // const reader = new FileReader();
        // reader.readAsText(event.target.files[0]);
        // reader.onload = (e) => {
        //     let inputJson;
        //     try {
        //         inputJson = JSON.parse(String(e.target.result));
        //     } catch (e) {
        //         console.log('failed parsing', e);
        //         //TODO show error
        //         return;
        //     }
        //
        //     if (!inputJson.attackers || !inputJson.defenders) {
        //         //TODO show error
        //         return;
        //     }
        //
        //     console.log(e.target.result);
        //
        //     if (inputJson.attackers) {
        //         inputJson.attackers.map((jsonUnit: any) => {
        //             const unit: Unit = {...defaultUnit};
        //             unit.id = uuidv4();
        //             if (jsonUnit.name) {
        //                 unit.name = jsonUnit.name;
        //             }
        //
        //             if (jsonUnit.combatspell) {
        //                 unit.name = jsonUnit.combatspell;
        //             }
        //
        //             if (jsonUnit.skills && jsonUnit.skills.length) {
        //                 unit.skills = jsonUnit.skills.map((skill) => {
        //
        //                 });
        //             }
        //
        //             this.props.addUnit('attackers', unit);
        //         });
        //     }
        // };
    };

    closeError = (): void => {
        this.props.setError(false);
    }

    render(): JSX.Element {
        const {attackers, defenders, editUnit, duplicateUnit, deleteUnit, loading, error} = this.props;

        return (
            <StylesProvider injectFirst>
                <Container>
                    <StyledAppBar position="static">
                        <Toolbar>
                            <Typography variant="h6">
                                Atlantis Battle simulator
                            </Typography>
                            <div style={{flexGrow: 1}}/>
                            <input onChange={this.uploadJson} accept="application/JSON" style={{display: 'none'}} id="icon-button-file" type="file" />
                            <label style={{display: 'none'}} htmlFor="icon-button-file">
                                <IconButton edge="end" color="inherit" component="span">
                                    <Tooltip title="Upload battle as a JSON file"><CloudUploadIcon /></Tooltip>
                                </IconButton>
                            </label>
                            <IconButton css="display: none;" edge="end" color="inherit">
                                <Tooltip title="Download battle as a JSON file"><CloudDownloadIcon /></Tooltip>
                            </IconButton>
                        </Toolbar>
                    </StyledAppBar>
                    <MainForm/>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <StyledPaper square elevation={3}>
                                <Typography variant="h5" component="h3">
                                    Attacker units
                                </Typography>
                                <Tooltip title="Clear all units on this side">
                                    <SideClearIcon
                                        css={'cursor: pointer'}
                                        onClick={this.props.resetSide.bind(null, 'attackers')}
                                        fontSize={'small'}
                                    />
                                </Tooltip>
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
                                <Typography variant="h5" component="h3">
                                    Defender units
                                </Typography>
                                <Tooltip title="Clear all units on this side">
                                    <SideClearIcon
                                        css={'cursor: pointer'}
                                        onClick={this.props.resetSide.bind(null, 'defenders')}
                                        fontSize={'small'}
                                    />
                                </Tooltip>
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

                    {this.state.battleText &&
                        <StyledPaper css={`margin-top: ${theme.spacing(2)}px; white-space: pre-wrap;`} elevation={3}>
                            <Typography variant="body2">
                                {this.state.battleText}
                            </Typography>
                        </StyledPaper>
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
