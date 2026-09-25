import {DraftV1, isDraft} from './persistence';
import {isJobId} from '../../shared/simulationJobs';

// Separate, per-tab recovery record; never written to draft or baseline storage.
export const JOB_SESSION_KEY = 'atlantis.simulationJob';
export type PendingSimulation = {
    id: string;
    path: string;
    setup: DraftV1;
    accepted: boolean;
    reported: boolean;
};
export const isPendingSimulation = (value: unknown): value is PendingSimulation => {
    if (!value || typeof value !== 'object') return false;
    const record = value as PendingSimulation;
    return (
        isJobId(record.id) &&
        typeof record.path === 'string' &&
        isDraft(record.setup) &&
        typeof record.accepted === 'boolean' &&
        typeof record.reported === 'boolean'
    );
};
