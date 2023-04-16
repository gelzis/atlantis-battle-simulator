/* global fetch */
import React, {ChangeEvent, PureComponent, ReactNode} from 'react';
import {connect} from 'react-redux';
import styled from 'styled-components';
import {
    Button,
    ButtonGroup,
    CircularProgress,
    Container,
    Grid,
    InputLabel,
    Snackbar,
    TextField,
    Tooltip,
} from '@material-ui/core';
import MuiAlert from '@material-ui/lab/Alert';
import {StylesProvider} from '@material-ui/core/styles';
import LaunchIcon from '@material-ui/icons/Launch';
import SettingsIcon from '@material-ui/icons/Settings';
import {bindActionCreators, Dispatch} from 'redux';
import DeleteIcon from '@material-ui/icons/Delete';
import posthog from 'posthog-js';

import {StyledPaper, StyledSideHeading, theme} from '../../StyledComponents';
import {MainForm} from './MainForm';
import {UnitList} from './UnitList';
import {
    AppState,
    ServerSimulationResponse,
} from '../types';
import {ObjectListSorted} from '../resources';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {SimulationResult} from './SimulationResult';
import {SettingsModal} from './SettingsModal';
import {PageFooter} from './PageFooter';
import {
    addUnit,
    closeSettings,
    deleteUnit,
    duplicateUnit,
    duplicateUnitToTheOtherSide,
    editUnit,
    openSettings,
    resetSide,
    resetState,
    setAttackersStructure,
    setDefendersStructure,
    setError,
    setLine,
    setLoadingStatus,
} from '../actions/simulatorActions';
import {SideStats} from './SideStats';
import {convertCurrentStateToJson} from './transformers';
import {Header} from './Header';

const RunBattleContainer = styled.div`
  text-align: center; 
  margin-top: ${theme.spacing(2)}px
`;

const SideClearIcon = styled(DeleteIcon)`
    position: absolute;
    top: 10px;
    right: 10px;
`;

type StateProps = Pick<AppState,
    'attackers' |
    'defenders' |
    'unit' |
    'loading' |
    'error' |
    'attackerStructure' |
    'defenderStructure' |
    'settingsWindowOpen' |
    'battleCount' |
    'attackerStats' |
    'defenderStats'
>
type DispatchProps = {
    editUnit: typeof editUnit
    duplicateUnit: typeof duplicateUnit
    deleteUnit: typeof deleteUnit
    addUnit: typeof addUnit
    resetState: typeof resetState
    resetSide: typeof resetSide
    setLoadingStatus: typeof setLoadingStatus
    setError: typeof setError
    setAttackersStructure: typeof setAttackersStructure
    setDefendersStructure: typeof setDefendersStructure
    duplicateUnitToTheOtherSide: typeof duplicateUnitToTheOtherSide
    openSettings: typeof openSettings
    closeSettings: typeof closeSettings
    setLine: typeof setLine
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
        attackerStats: state.attackerStats,
        defenderStats: state.defenderStats,
        unit: state.unit,
        loading: state.loading,
        error: state.error,
        settingsWindowOpen: state.settingsWindowOpen,
        battleCount: state.battleCount,
    };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
    return bindActionCreators({
        addUnit,
        closeSettings,
        deleteUnit,
        duplicateUnit,
        duplicateUnitToTheOtherSide,
        editUnit,
        openSettings,
        resetSide,
        resetState,
        setAttackersStructure,
        setDefendersStructure,
        setError,
        setLine,
        setLoadingStatus,
    }, dispatch);
};

export class BattleSimulatorClass extends PureComponent<BattleSimulatorProps, BattleSimulatorClassState> {
    constructor(props: BattleSimulatorProps) {
        super(props);

        this.state = {};
    }

    runBattle = async(): Promise<void> => {
        this.setState({
            battleResult: undefined,
        });

        const exportJson = convertCurrentStateToJson({
            attackers: this.props.attackers,
            defenders: this.props.defenders,
            defenderStructure: this.props.defenderStructure,
            attackerStructure: this.props.attackerStructure,
        });

        this.props.setLoadingStatus(true);

        const response = await fetch('/battle', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                battle: exportJson,
                battleCount: this.props.battleCount,
            }),
        });

        this.props.setLoadingStatus(false);

        if (!response.ok) {
            this.props.setError(true, 'Failed to launch battle, check your input units or try to reduce the number of battles run!');
            return;
        }

        const simulationData: ServerSimulationResponse = await response.json();

        this.setState({
            battleResult: simulationData,
        });

        posthog.capture('battle_run');
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

    render() {
        const {
            attackers,
            defenders,
            attackerStructure,
            duplicateUnitToTheOtherSide,
            defenderStructure,
            editUnit,
            duplicateUnit,
            deleteUnit,
            loading,
            error,
            openSettings,
            closeSettings,
            setLine,
            attackerStats,
            defenderStats,
        } = this.props;

        return (
            <StylesProvider injectFirst>
                <Container css="flex-grow: 1;">
                    <Header/>
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
                                <SideStats stats={attackerStats}/>
                                <InputLabel shrink>
                                   Structure
                                </InputLabel>
                                <Autocomplete
                                    id="attacker-structure-autocomplete"
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
                                    onDuplicateUnitToOtherSide={duplicateUnitToTheOtherSide}
                                    onChangeLine={setLine}
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
                                <SideStats stats={defenderStats}/>
                                <InputLabel shrink>
                                    Structure
                                </InputLabel>
                                <Autocomplete
                                    id="defender-structure-autocomplete"
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
                                    onDuplicateUnitToOtherSide={duplicateUnitToTheOtherSide}
                                    onChangeLine={setLine}
                                />
                            </StyledPaper>
                        </Grid>
                    </Grid>

                    <RunBattleContainer>
                        <ButtonGroup disableElevation variant="contained" color="primary">
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
                            <Button onClick={openSettings}>
                                <SettingsIcon />
                            </Button>
                        </ButtonGroup>
                    </RunBattleContainer>

                    {this.state.battleResult &&
                        <SimulationResult {...this.state.battleResult} />
                    }
                </Container>
                <PageFooter/>

                <Snackbar anchorOrigin={{vertical: 'top', horizontal: 'center'}} open={error.open} autoHideDuration={6000} onClose={this.closeError}>
                    <MuiAlert elevation={6} variant="filled" onClose={this.closeError} severity="error">
                        {error.text}
                    </MuiAlert>
                </Snackbar>

                {this.props.settingsWindowOpen && <SettingsModal onClose={closeSettings}/>}
            </StylesProvider>
        );
    }
}

export const BattleSimulator = connect(mapStateToProps, mapDispatchToProps)(BattleSimulatorClass);
