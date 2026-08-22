import path from 'path';
import {execFile} from 'child_process';
import {unlinkSync, writeFileSync} from 'fs';
import {v4 as uuidv4} from 'uuid';
import express from 'express';
import bodyParser from 'body-parser';
import {BattleStore} from './battleStore';

const app = express();
const port = process.env.PORT || 4020;
const databasePath = process.env.BATTLE_DATABASE_PATH || path.join(__dirname, '../../data/battles.sqlite');
const battleStore = new BattleStore(databasePath);

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

app.post('/battle', async(req, res) => {
    const sideHasUnits = (side: {units?: unknown, structures?: unknown[]}): boolean => {
        if (!side || typeof side !== 'object') return false;
        if (Array.isArray(side.units)) return true;
        if (!Array.isArray(side.structures)) return false;
        return side.structures.some(
            (structure: {units?: unknown}) => structure && Array.isArray(structure.units),
        );
    };

    if (!req.body.battle ||
        !req.body.battle.attackers ||
        !req.body.battle.defenders ||
        !sideHasUnits(req.body.battle.attackers) ||
        !sideHasUnits(req.body.battle.defenders)
    ) {
        return res.sendStatus(400);
    }

    let battleCount = 50;
    const battleCountInput = parseInt(req.body.battleCount);
    if (battleCountInput >= 1 && battleCountInput <= 100) {
        battleCount = battleCountInput;
    }

    const filename = `${uuidv4()}.json`;
    const filePath = path.join(__dirname, `../../dist/${filename}`);

    writeFileSync(filePath, JSON.stringify(req.body.battle));

    // no longer than 1 minute
    execFile(`${path.join(__dirname, '../../src/engine/engine')}`, ['battle', filePath, String(battleCount)], {timeout: 60000}, (error, stdout) => {
        unlinkSync(filePath);
        if (error) {
            console.log(stdout);
            console.log(error);
            res.sendStatus(500);
            return;
        }

        res.send(stdout);
    });
});

app.get('/b/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../../src/public/index.html'));
});

// Start accepting requests only after the database schema is ready.
battleStore.initialize().then(() => {
    app.listen(port, () => {
        console.log(`server started on port ${port}`);
    });
}).catch((error) => {
    console.error('Failed to initialize battle database', error);
    process.exit(1);
});
