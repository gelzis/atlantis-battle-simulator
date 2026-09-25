import posthog from 'posthog-js';
import {SimulationJob} from '../../shared/simulationJobs';
import {ServerSimulationResponse} from './types';

type SimulationEvent =
    | 'battle_submission_started'
    | 'battle_submission_accepted'
    | 'battle_submission_failed'
    | 'battle_recovery_started'
    | 'battle_cancel_requested'
    | 'battle_cancel_failed'
    | 'battle_run'
    | 'battle_run_unsuccessful';

export const captureSimulationEvent = (
    event: SimulationEvent,
    properties: Record<string, string | number | boolean | null>,
): void => {
    try {
        posthog.capture(event, properties);
    } catch {
        // Analytics must never interrupt the simulation lifecycle.
    }
};

// Use only server timestamps: polling delays and browser clock skew must not inflate engine timings.
export const captureSimulationOutcome = (
    job: SimulationJob,
    requestedCount: number,
    result?: ServerSimulationResponse,
): void => {
    const duration = (start: number | null, end: number | null): number | null =>
        start === null || end === null ? null : Math.max(0, end - start);
    const executionMs = duration(job.startedAt, job.finishedAt);
    const completedCount = result ? result.wins + result.loses + result.draws : null;
    captureSimulationEvent(result ? 'battle_run' : 'battle_run_unsuccessful', {
        job_id: job.id,
        status: job.status,
        requested_simulations: requestedCount,
        completed_simulations: completedCount,
        queue_wait_ms: duration(job.createdAt, job.startedAt ?? job.finishedAt),
        execution_ms: executionMs,
        total_job_ms: duration(job.createdAt, job.finishedAt),
        execution_timeout_ms: job.executionTimeoutMs,
        execution_ms_per_simulation: completedCount && executionMs !== null ? executionMs / completedCount : null,
    });
};
