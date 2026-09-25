/* global fetch */
import React, {SyntheticEvent, PureComponent, ReactNode} from 'react';
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
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import {StyledEngineProvider} from '@mui/material/styles';
import LaunchIcon from '@mui/icons-material/Launch';
import SettingsIcon from '@mui/icons-material/Settings';
import {bindActionCreators, Dispatch} from 'redux';
import DeleteIcon from '@mui/icons-material/Delete';
import posthog from 'posthog-js';
import {v4 as uuidv4} from 'uuid';

import {StyledPaper, StyledSideHeading, theme} from '../../StyledComponents';
import {MainForm} from './MainForm';
import {UnitList} from './UnitList';
import {AppState, ExportJson, ServerSimulationResponse} from '../types';
import {ObjectListSorted} from '../resources';
import Autocomplete from '@mui/material/Autocomplete';
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
import {loadBattleIntoStore} from '../battleImport';
import {BaselineV1, captureDraft, completedRun, restoreDraft, StoredRecord} from '../persistence';
import {isPendingSimulation, JOB_SESSION_KEY, PendingSimulation} from '../simulationSession';
import {isActiveJob, isSimulationJob, isSimulationResult, SimulationJob} from '../../../shared/simulationJobs';
import {BaselineComparison, PersistenceWarning} from './LocalPersistence';

const RunBattleContainer = styled.div`
    text-align: center;
    margin-top: ${theme.spacing(2)};
`;

const SideClearIcon = styled(DeleteIcon)`
    position: absolute;
    top: 10px;
    right: 10px;
`;

type StateProps = Pick<
    AppState,
    | 'attackers'
    | 'defenders'
    | 'unit'
    | 'loading'
    | 'error'
    | 'attackerStructure'
    | 'defenderStructure'
    | 'settingsWindowOpen'
    | 'battleCount'
    | 'attackerStats'
    | 'defenderStats'
>;
type DispatchProps = {
    editUnit: typeof editUnit;
    duplicateUnit: typeof duplicateUnit;
    deleteUnit: typeof deleteUnit;
    addUnit: typeof addUnit;
    resetState: typeof resetState;
    resetSide: typeof resetSide;
    setLoadingStatus: typeof setLoadingStatus;
    setError: typeof setError;
    setAttackersStructure: typeof setAttackersStructure;
    setDefendersStructure: typeof setDefendersStructure;
    duplicateUnitToTheOtherSide: typeof duplicateUnitToTheOtherSide;
    openSettings: typeof openSettings;
    closeSettings: typeof closeSettings;
    setLine: typeof setLine;
    loadBattle: (battle: ExportJson) => void;
};
type BattleSimulatorProps = StateProps & DispatchProps;

type BattleSimulatorClassState = {
    battleResult?: ServerSimulationResponse;
    completed?: BaselineV1;
    job?: SimulationJob;
    jobMessage?: string;
    jobWarning?: string;
    cancelling?: boolean;
};

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
    return {
        ...bindActionCreators(
            {
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
            },
            dispatch,
        ),
        loadBattle: (battle: ExportJson): void => loadBattleIntoStore(battle, dispatch),
    };
};

export class BattleSimulatorClass extends PureComponent<BattleSimulatorProps, BattleSimulatorClassState> {
    constructor(props: BattleSimulatorProps) {
        super(props);

        this.state = {};
    }

    private mounted = false;
    private pollTimer: ReturnType<typeof setTimeout>;
    private acknowledgementTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private requests = new AbortController();
    private session: StoredRecord<PendingSimulation>;
    private pending?: PendingSimulation;

    componentDidMount = async (): Promise<void> => {
        this.mounted = true;
        this.session = new StoredRecord(() => window.sessionStorage, JOB_SESSION_KEY, isPendingSimulation);
        this.setState({jobWarning: this.session.warning});
        const match = window.location.pathname.match(/^\/b\/([a-f0-9]{64})\/?$/);
        if (match) {
            this.props.setLoadingStatus(true);
            try {
                const response = await fetch(`/saved-battles/${match[1]}`, {signal: this.requests.signal});
                if (!response.ok)
                    throw new Error(
                        response.status === 404
                            ? 'This saved battle does not exist.'
                            : 'Failed to load the saved battle.',
                    );
                const saved: {battle: ExportJson} = await response.json();
                if (this.mounted) this.props.loadBattle(saved.battle);
            } catch (error) {
                if (this.mounted)
                    this.props.setError(
                        true,
                        error instanceof Error ? error.message : 'Failed to load the saved battle.',
                    );
            } finally {
                if (this.mounted) this.props.setLoadingStatus(false);
            }
        }
        if (!this.mounted) return;
        if (this.session.value?.path === window.location.pathname) {
            this.pending = this.session.value;
            this.props.setLoadingStatus(true);
            this.setState({jobMessage: 'Reconnecting to simulation…'});
            if (this.pending.accepted) await this.pollJob();
            else await this.submitJob();
        }
    };

    componentWillUnmount(): void {
        this.mounted = false;
        clearTimeout(this.pollTimer);
        this.acknowledgementTimers.forEach((timer) => clearTimeout(timer));
        this.acknowledgementTimers.clear();
        this.requests.abort();
        this.props.setLoadingStatus(false);
    }

    private saveSession(): void {
        // Sharing the current page can change its URL during a run.
        this.pending = {...this.pending, path: window.location.pathname};
        if (!this.session.save(this.pending)) {
            this.setState({
                jobWarning:
                    'Simulation recovery could not be saved in this tab. Keep this page open to receive the result. ' +
                    this.session.warning,
            });
        } else {
            this.setState({jobWarning: ''});
        }
    }

    runBattle = async (): Promise<void> => {
        if (this.props.loading) return;
        const setup = captureDraft(this.props);
        // Reuse the submission ID after an ambiguous network failure, avoiding duplicate work.
        if (!this.pending || this.pending.accepted || JSON.stringify(this.pending.setup) !== JSON.stringify(setup)) {
            this.pending = {id: uuidv4(), path: window.location.pathname, setup, accepted: false, reported: false};
        }
        this.saveSession();
        this.setState({
            battleResult: undefined,
            completed: undefined,
            job: undefined,
            jobMessage: 'Submitting simulation…',
            cancelling: false,
        });
        this.props.setLoadingStatus(true);
        this.props.setError(false);
        await this.submitJob();
    };

    private async submitJob(): Promise<void> {
        try {
            const response = await fetch('/simulation-jobs', {
                method: 'POST',
                headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
                signal: this.requests.signal,
                body: JSON.stringify({
                    requestId: this.pending.id,
                    battle: convertCurrentStateToJson(restoreDraft(this.pending.setup)),
                    battleCount: this.pending.setup.simulationCount,
                }),
            });
            if (!response.ok) {
                throw new Error(
                    response.status === 429
                        ? 'The simulation queue is full. Please try again later.'
                        : 'Failed to launch battle. Check your units and try again.',
                );
            }
            const job: unknown = await response.json();
            if (!isSimulationJob(job) || job.id !== this.pending.id)
                throw new Error('Invalid simulation response. Please try again.');
            if (!this.mounted) return;
            this.pending = {...this.pending, accepted: true};
            this.saveSession();
            await this.acceptJob(job);
        } catch (error) {
            if (!this.mounted) return;
            const message = error instanceof Error ? error.message : 'Could not submit the simulation.';
            this.setState({
                jobMessage: 'Submission could not be confirmed. Try again to reconnect using the same submission.',
            });
            this.props.setError(true, `${message} Please try again.`);
            this.props.setLoadingStatus(false);
        }
    }

    private schedulePoll(): void {
        clearTimeout(this.pollTimer);
        if (this.mounted)
            this.pollTimer = setTimeout(() => {
                this.pollJob();
            }, 2000);
    }

    private async pollJob(): Promise<void> {
        try {
            const response = await fetch(`/simulation-jobs/${this.pending.id}`, {signal: this.requests.signal});
            if (!this.mounted) return;
            if (response.status === 404) {
                this.clearJobRecovery(this.pending.id);
                this.setState({
                    jobMessage: 'This simulation is no longer available. Results are retained for a limited time.',
                    cancelling: false,
                });
                this.props.setLoadingStatus(false);
                return;
            }
            if (!response.ok) throw new Error('Status unavailable');
            const job: unknown = await response.json();
            if (!isSimulationJob(job) || job.id !== this.pending.id) throw new Error('Invalid simulation status');
            if (this.mounted) await this.acceptJob(job);
        } catch (error) {
            if (!this.mounted) return;
            this.setState({jobMessage: 'Connection interrupted. Reconnecting to the simulation…'});
            this.schedulePoll();
        }
    }

    private async acceptJob(job: SimulationJob): Promise<void> {
        if (!this.mounted) return;
        this.setState({job});
        if (isActiveJob(job.status)) {
            const seconds = Math.max(0, Math.floor((Date.now() - (job.startedAt || job.createdAt)) / 1000));
            this.setState({
                jobMessage:
                    job.status === 'queued'
                        ? `Queued · waiting ${seconds}s`
                        : `Running · elapsed ${seconds}s · time limit ${Math.ceil(job.executionTimeoutMs / 1000)}s`,
            });
            if (this.pending.path !== window.location.pathname) this.saveSession();
            this.schedulePoll();
            return;
        }
        if (job.status === 'completed') {
            try {
                const response = await fetch(`/simulation-jobs/${job.id}/result`, {signal: this.requests.signal});
                if (!response.ok) throw new Error('Result unavailable');
                const result: unknown = await response.json();
                if (!isSimulationResult(result)) throw new Error('Invalid result');
                if (!this.mounted) return;
                const completed = completedRun(this.pending.setup, result);
                completed.completedAt = new Date(job.finishedAt).toISOString();
                if (!this.pending.reported) {
                    posthog.capture('battle_run');
                    this.pending = {...this.pending, reported: true};
                    this.saveSession();
                }
                this.setState(
                    {battleResult: result, completed, jobMessage: 'Simulation completed.', cancelling: false},
                    () => {
                        this.acknowledgeResult(job.id);
                    },
                );
            } catch (error) {
                if (this.mounted) {
                    this.setState({jobMessage: 'Simulation completed. Retrying result download…'});
                    this.schedulePoll();
                }
                return;
            }
        } else {
            this.setState({jobMessage: job.error || `Simulation ${job.status}.`, cancelling: false});
        }
        this.props.setLoadingStatus(false);
    }

    private clearJobRecovery(id: string): void {
        if (this.pending?.id !== id) return;
        this.pending = undefined;
        if (this.session.value?.id === id && !this.session.remove()) {
            this.setState({
                jobWarning:
                    'Could not clear simulation recovery in this tab. The delivered result remains available on this page.',
            });
        }
    }

    private async acknowledgeResult(id: string): Promise<void> {
        if (!this.mounted) return;
        try {
            const response = await fetch(`/simulation-jobs/${id}/acknowledge`, {
                method: 'POST',
                signal: this.requests.signal,
            });
            if (!response.ok) throw new Error('Acknowledgement failed');
            if (!this.mounted) return;
            this.acknowledgementTimers.delete(id);
            // A late acknowledgement must not clear a newer run's recovery record.
            this.clearJobRecovery(id);
        } catch (error) {
            if (this.mounted) {
                this.acknowledgementTimers.set(
                    id,
                    setTimeout(() => {
                        this.acknowledgeResult(id);
                    }, 2000),
                );
            }
        }
    }

    cancelJob = async (): Promise<void> => {
        if (!this.pending || this.state.cancelling) return;
        this.setState({cancelling: true});
        try {
            const response = await fetch(`/simulation-jobs/${this.pending.id}/cancel`, {
                method: 'POST',
                signal: this.requests.signal,
            });
            if (!response.ok) throw new Error('Cancellation failed');
        } catch (error) {
            if (this.mounted) {
                this.setState({cancelling: false});
                this.props.setError(true, 'Could not cancel the simulation. Please try again.');
            }
        }
    };

    private clearResult = (): void => {
        this.pending = undefined;
        const removed = this.session.remove();
        this.setState({
            battleResult: undefined,
            completed: undefined,
            job: undefined,
            jobMessage: '',
            jobWarning: removed
                ? ''
                : 'Could not clear simulation recovery in this tab. A refresh may display the previous result.',
        });
    };

    OnChangeAttackerStructure = (event: SyntheticEvent, value: string): void => {
        this.props.setAttackersStructure(value);
    };

    OnChangeDefenderStructure = (event: SyntheticEvent, value: string): void => {
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
            <StyledEngineProvider injectFirst>
                <Container css="flex-grow: 1;">
                    <Header />
                    <PersistenceWarning />
                    <MainForm />
                    <Grid container spacing={3}>
                        <Grid size={{xs: 12, sm: 6}}>
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
                                <SideStats stats={attackerStats} />
                                <InputLabel shrink>Structure</InputLabel>
                                <Autocomplete
                                    id="attacker-structure-autocomplete"
                                    options={ObjectListSorted}
                                    onChange={this.OnChangeAttackerStructure}
                                    value={attackerStructure}
                                    size={'small'}
                                    renderInput={(params): ReactNode => (
                                        <TextField
                                            {...params}
                                            size="small"
                                            variant="outlined"
                                            css={`
                                                margin-bottom: ${theme.spacing(1)};
                                            `}
                                        />
                                    )}
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
                        <Grid size={{xs: 12, sm: 6}}>
                            <StyledPaper square elevation={3}>
                                <StyledSideHeading variant="h5">Defender units</StyledSideHeading>
                                <Tooltip title="Clear all units on this side">
                                    <SideClearIcon
                                        css={'cursor: pointer'}
                                        onClick={this.props.resetSide.bind(null, 'defenders')}
                                        fontSize={'small'}
                                    />
                                </Tooltip>
                                <SideStats stats={defenderStats} />
                                <InputLabel shrink>Structure</InputLabel>
                                <Autocomplete
                                    id="defender-structure-autocomplete"
                                    options={ObjectListSorted}
                                    onChange={this.OnChangeDefenderStructure}
                                    value={defenderStructure}
                                    size={'small'}
                                    renderInput={(params): ReactNode => (
                                        <TextField
                                            {...params}
                                            size="small"
                                            variant="outlined"
                                            css={`
                                                margin-bottom: ${theme.spacing(1)};
                                            `}
                                        />
                                    )}
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
                                disabled={loading}
                                aria-label={loading ? 'Running battle' : 'Run battle'}
                            >
                                {loading && <CircularProgress color="inherit" size={24} />}
                                {!loading && 'Run battle'}
                            </Button>
                            <Button onClick={openSettings} aria-label="Simulation settings">
                                <SettingsIcon />
                            </Button>
                        </ButtonGroup>
                        {this.state.jobMessage && (
                            <div role="status" style={{marginTop: theme.spacing(1)}}>
                                {this.state.jobMessage}
                            </div>
                        )}
                        {loading && this.state.job && isActiveJob(this.state.job.status) && (
                            <Button onClick={this.cancelJob} disabled={this.state.cancelling}>
                                {this.state.cancelling ? 'Cancelling…' : 'Cancel simulation'}
                            </Button>
                        )}
                        {this.state.jobWarning && <MuiAlert severity="warning">{this.state.jobWarning}</MuiAlert>}
                    </RunBattleContainer>

                    <BaselineComparison current={this.state.completed} busy={loading} onRestore={this.clearResult} />
                    {this.state.battleResult && <SimulationResult {...this.state.battleResult} />}
                </Container>
                <PageFooter />

                <Snackbar
                    anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                    open={error.open}
                    autoHideDuration={6000}
                    onClose={this.closeError}
                >
                    <MuiAlert elevation={6} variant="filled" onClose={this.closeError} severity="error">
                        {error.text}
                    </MuiAlert>
                </Snackbar>

                {this.props.settingsWindowOpen && <SettingsModal onClose={closeSettings} />}
            </StyledEngineProvider>
        );
    }
}

export const BattleSimulator = connect(mapStateToProps, mapDispatchToProps)(BattleSimulatorClass);
