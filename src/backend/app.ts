import path from 'path';
import {execFile} from 'child_process';
import {unlinkSync, writeFileSync} from 'fs';
import {v4 as uuidv4} from 'uuid';
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 4020;
app.use(bodyParser.json());

app.use('/dist/main.js', express.static(path.join(__dirname, '../../src/public/dist/main.js'), {cacheControl: false, etag: false}));
app.use('/', express.static(path.join(__dirname, '../../src/public')));

app.post('/battle', async(req, res) => {
    if (!req.body.battle || !Array.isArray(req.body.battle.attackers) || !Array.isArray(req.body.battle.defenders)) {
        return res.sendStatus(400);
    }

    const filename = `${uuidv4()}.json`;
    const filePath = path.join(__dirname, `../../dist/${filename}`);

    writeFileSync(filePath, JSON.stringify(req.body.battle));

    // no longer than 1 minute
    execFile(`${path.join(__dirname, '../../src/engine/engine')}`, ['battle', filePath], {timeout: 60000}, (error, stdout) => {
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
