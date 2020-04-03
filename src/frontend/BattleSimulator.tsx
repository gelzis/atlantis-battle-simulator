import React, {ChangeEvent, PureComponent} from 'react';
import {connect} from 'react-redux';
import styled from 'styled-components';
import {
    Container,
    Typography,
    IconButton,
    Toolbar,
    Grid,
    Button, Tooltip,
} from '@material-ui/core';
import {StylesProvider} from '@material-ui/core/styles';
import LaunchIcon from '@material-ui/icons/Launch';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';

import {StyledAppBar, StyledPaper, theme} from './StyledComponents';
import {MainForm} from './MainForm';
import {UnitList} from './UnitList';
// import {defaultUnit} from './reducer';
import {AppState, EDIT_UNIT, DELETE_UNIT, DUPLICATE_UNIT, Unit, Side, ADD_UNIT, RESET_STATE} from './types';
import {Dispatch} from 'redux';
// import {json} from 'express';
// import {v4 as uuidv4} from 'uuid';

const RunBattleContainer = styled.div`
  text-align: center; 
  margin-top: ${theme.spacing(2)}px
`;

type StateProps = Pick<AppState, 'attackers' | 'defenders' | 'unit'>
type DispatchProps = {
    editUnit: (id: string) => void
    duplicateUnit: (id: string) => void
    deleteUnit: (id: string) => void
    addUnit: (side: Side, unit: Unit) => void
    resetState: () => void
}
type BattleSimulatorProps = StateProps & DispatchProps;

const mapStateToProps = (state: AppState): StateProps => {
    return {
        attackers: state.attackers,
        defenders: state.defenders,
        unit: state.unit,
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
});

export class BattleSimulatorClass extends PureComponent<BattleSimulatorProps> {
    runBattle = () => {
        console.log('run battle');
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
        const {attackers, defenders, editUnit, duplicateUnit, deleteUnit} = this.props;

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
                        <Grid item xs={6}>
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
                        <Grid item xs={6}>
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
                            startIcon={<LaunchIcon />}
                            onClick={this.runBattle}
                        >
                            Run battle
                        </Button>
                    </RunBattleContainer>
                </Container>
            </StylesProvider>
        );
    }
}

export const BattleSimulator = connect(mapStateToProps, mapDispatchToProps)(BattleSimulatorClass);
