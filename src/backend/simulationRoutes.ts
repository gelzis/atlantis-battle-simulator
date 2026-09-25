import {Router} from 'express';
import {randomUUID} from 'crypto';
import {isActiveJob, isJobId} from '../shared/simulationJobs';
import {JobRequestError, SimulationJobs} from './simulationJobs';

const sideHasUnits = (side: unknown): boolean => {
    if (!side || typeof side !== 'object') return false;
    const value = side as {units?: unknown, structures?: {units?: unknown}[]};
    return Array.isArray(value.units) || (Array.isArray(value.structures) &&
        value.structures.some(structure => structure && Array.isArray(structure.units)));
};

export const simulationRoutes = (jobs: SimulationJobs): Router => {
    const router = Router();
    const submit = (body: {battle?: {attackers?: unknown, defenders?: unknown}, battleCount?: string, requestId?: string}, legacy = false) => {
        if (!sideHasUnits(body?.battle?.attackers) || !sideHasUnits(body?.battle?.defenders)) {
            throw new JobRequestError(400, 'Invalid battle setup. Check your units and try again.');
        }
        const id = legacy ? randomUUID() : body.requestId;
        if (!isJobId(id)) throw new JobRequestError(400, 'A valid submission ID is required.');
        const count = parseInt(body.battleCount);
        return jobs.submit(id, body.battle, count >= 1 && count <= 100 ? count : 50);
    };
    router.post('/simulation-jobs', async(req, res) => {
        const job = await submit(req.body);
        res.status(202).location(`/simulation-jobs/${job.id}`).json(job);
    });
    router.param('id', (req, res, next, id) => {
        if (!isJobId(id)) return res.status(404).json({error: 'Simulation job not found.'});
        next();
    });
    router.get('/simulation-jobs/:id', async(req, res) => {
        const job = await jobs.get(req.params.id);
        if (!job) throw new JobRequestError(404, 'Simulation job not found or expired.');
        res.setHeader('Cache-Control', 'no-store');
        res.json(job);
    });
    router.get('/simulation-jobs/:id/result', async(req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.json(await jobs.result(req.params.id));
    });
    router.post('/simulation-jobs/:id/cancel', async(req, res) => {
        res.json(await jobs.cancel(req.params.id));
    });
    // Preserve existing clients' result format while applying the same queue and limits.
    router.post('/battle', async(req, res) => {
        let job = await submit(req.body, true);
        while (isActiveJob(job.status) && !res.destroyed) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            job = await jobs.get(job.id);
            if (!job) throw new JobRequestError(404, 'Simulation job expired.');
        }
        if (res.destroyed) return;
        if (job.status !== 'completed') throw new JobRequestError(job.status === 'timed_out' ? 504 : 500, job.error);
        res.json(await jobs.result(job.id));
    });
    router.use((error: Error, _req: import('express').Request, res: import('express').Response, _next: import('express').NextFunction) => {
        if (res.headersSent) return _next(error);
        if (error instanceof JobRequestError) {
            if (error.statusCode === 429) res.setHeader('Retry-After', '5');
            res.status(error.statusCode).json({error: error.message});
        } else {
            console.error(error);
            res.status(500).json({error: 'Simulation service unavailable. Please try again.'});
        }
    });
    return router;
};
