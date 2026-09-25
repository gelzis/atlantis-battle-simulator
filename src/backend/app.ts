import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import {BattleStore} from './battleStore';
import {SimulationJobs, jobOptionsFromEnv} from './simulationJobs';
import {simulationRoutes} from './simulationRoutes';

const app = express();
const port = process.env.PORT || 4020;
const databasePath = process.env.BATTLE_DATABASE_PATH || path.join(__dirname, '../../data/battles.sqlite');
const battleStore = new BattleStore(databasePath);
const jobs = new SimulationJobs(databasePath, undefined, jobOptionsFromEnv());

app.use(bodyParser.json());

app.use('/dist/main.js', express.static(path.join(__dirname, '../../src/public/dist/main.js'), {
    cacheControl: false,
    etag: false,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store');
    },
}));
app.use('/dist/martial_points.js', express.static(path.join(__dirname, '../../src/public/dist/martial_points.js'), {
    cacheControl: false,
    etag: false,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store');
    },
}));
app.use('/', express.static(path.join(__dirname, '../../src/public')));

app.get('/martial-points', async(req, res) => {
    res.sendFile(path.join(__dirname, '../../src/public/martial_points.html'));
});

const isBattle = (battle: unknown): battle is {attackers: unknown, defenders: unknown} => {
    if (!battle || typeof battle !== 'object') return false;
    const value = battle as {attackers?: unknown, defenders?: unknown};
    return !!value.attackers && typeof value.attackers === 'object' &&
        !!value.defenders && typeof value.defenders === 'object';
};

app.post('/saved-battles', async(req, res) => {
    if (!isBattle(req.body.battle)) return res.sendStatus(400);

    try {
        const saved = await battleStore.save(req.body.battle);
        res.status(201).json({id: saved.id, url: `/b/${saved.id}`});
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.get('/saved-battles/:id', async(req, res) => {
    if (!/^[a-f0-9]{64}$/.test(req.params.id)) return res.sendStatus(404);

    try {
        const saved = await battleStore.get(req.params.id);
        if (!saved) return res.sendStatus(404);
        res.json(saved);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.use(simulationRoutes(jobs));

app.get('/b/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../../src/public/index.html'));
});

// Start accepting requests only after the database schema is ready.
Promise.all([battleStore.initialize(), jobs.initialize()]).then(() => {
    const server = app.listen(port, () => {
        console.log(`server started on port ${port}`);
    });
    let stopping = false;
    const shutdown = async() => {
        if (stopping) return;
        stopping = true;
        server.close();
        await jobs.close();
        await battleStore.close();
    };
    ['SIGTERM', 'SIGINT'].forEach(signal => process.on(signal, () => {
        shutdown().catch(error => { console.error(error); process.exitCode = 1; });
    }));
}).catch((error) => {
    console.error('Failed to initialize battle database', error);
    process.exit(1);
});
