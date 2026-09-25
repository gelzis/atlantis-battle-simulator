import type {ServerSimulationResponse, StatRecord} from '../frontend/BattleSimulator/types';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'timed_out' | 'cancelled' | 'expired';
export type SimulationJob = {
    id: string;
    status: JobStatus;
    createdAt: number;
    startedAt: number | null;
    finishedAt: number | null;
    executionTimeoutMs: number;
    error: string | null;
};

export const isJobId = (value: unknown): value is string =>
    typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
export const isActiveJob = (status: JobStatus): boolean => status === 'queued' || status === 'running';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const stats = (value: unknown): value is StatRecord =>
    object(value) &&
    ['min', 'max', 'range', 'occurance', 'mean', 'median', 'mode', 'stdDev'].every((key) => finite(value[key])) &&
    Array.isArray(value.percentile) &&
    value.percentile.every(finite);

export const isSimulationResult = (value: unknown): value is ServerSimulationResponse =>
    object(value) &&
    ['wins', 'loses', 'draws'].every(
        (key) => finite(value[key]) && Number.isInteger(value[key]) && Number(value[key]) >= 0,
    ) &&
    finite(value.winRatio) &&
    value.winRatio >= 0 &&
    value.winRatio <= 100 &&
    stats(value.attackerLooses) &&
    stats(value.defenderLooses) &&
    Array.isArray(value.spoils) &&
    value.spoils.every(
        (item) => stats(item) && typeof (item as unknown as Record<string, unknown>).item === 'string',
    ) &&
    ['victoryBattleText', 'lossBattleText', 'drawBattleText'].every(
        (key) => value[key] === undefined || typeof value[key] === 'string',
    );

export const isSimulationJob = (value: unknown): value is SimulationJob =>
    object(value) &&
    isJobId(value.id) &&
    ['queued', 'running', 'completed', 'failed', 'timed_out', 'cancelled', 'expired'].includes(String(value.status)) &&
    finite(value.createdAt) &&
    (value.startedAt === null || finite(value.startedAt)) &&
    (value.finishedAt === null || finite(value.finishedAt)) &&
    finite(value.executionTimeoutMs) &&
    (value.error === null || typeof value.error === 'string');
