import path from 'path';
import {execFile} from 'child_process';
import {unlinkSync, writeFileSync} from 'fs';
import {v4 as uuidv4} from 'uuid';
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 4020;

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

app.post('/battle', async(req, res) => {
    if (!req.body.battle ||
        !req.body.battle.attackers ||
        !req.body.battle.defenders ||
        !Array.isArray(req.body.battle.attackers.units) ||
        !Array.isArray(req.body.battle.defenders.units)
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

// start the express server
app.listen(port, () => {
    console.log(`server started on port ${port}`);
});
