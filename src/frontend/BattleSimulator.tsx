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
} from '@material-ui/core';
import {StylesProvider} from '@material-ui/core/styles';
import LaunchIcon from '@material-ui/icons/Launch';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';

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
    ExportUnit, SET_LOADING_STATUS,
} from './types';
import {Dispatch} from 'redux';
// import {json} from 'express';
// import {v4 as uuidv4} from 'uuid';

const RunBattleContainer = styled.div`
  text-align: center; 
  margin-top: ${theme.spacing(2)}px
`;

const LoadingSpinner = styled(CircularProgress)`
    
`;

type StateProps = Pick<AppState, 'attackers' | 'defenders' | 'unit' | 'loading'>
type DispatchProps = {
    editUnit: (id: string) => void
    duplicateUnit: (id: string) => void
    deleteUnit: (id: string) => void
    addUnit: (side: Side, unit: Unit) => void
    resetState: () => void
    setLoadingStatus: (status: boolean) => void
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

    setLoadingStatus(status): void {
        dispatch({
            type: SET_LOADING_STATUS,
            payload: {
                status,
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
            // TODO show error!
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

    render(): JSX.Element {
        const {attackers, defenders, editUnit, duplicateUnit, deleteUnit, loading} = this.props;

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
                            {loading && <LoadingSpinner color="inherit" size={24}/>}
                            {!loading && 'Run battle'}
                        </Button>
                    </RunBattleContainer>

                    {this.state.battleText &&
                        <StyledPaper css={`margin-top: ${theme.spacing(2)}px `} elevation={3}>
                            <pre>{this.state.battleText}</pre>
                        </StyledPaper>
                    }
                </Container>
            </StylesProvider>
        );
    }
}

export const BattleSimulator = connect(mapStateToProps, mapDispatchToProps)(BattleSimulatorClass);
