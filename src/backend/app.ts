import path from 'path';
import {spawn} from 'child_process';
import {writeFileSync, unlinkSync} from 'fs';
import {v4 as uuidv4} from 'uuid';

import express from 'express';

const app = express();
const port = process.env.PORT || 4020;

app.use('/dist/main.js', express.static(path.join(__dirname, '../../src/public/dist/main.js'), {cacheControl: false}));
app.use('/', express.static(path.join(__dirname, '../../src/public')));

app.post('/battle', async(req, res) => {
    if (!req.body.battle || !Array.isArray(req.body.battle.attackers) || !Array.isArray(req.body.battle.defenders)) {
        return res.sendStatus(400);
    }

    const filename = `${uuidv4()}.json`;
    const filePath = path.join(__dirname, `../../src/engine/${filename}`);
    writeFileSync(filePath, `{
        "attackers": [
            {
                "name": "pidars", 
                "skills": [
                    {"abbr": "TACT", "level": 4},
                    {"abbr": "FORC", "level": 4},
                    {"abbr": "FIRE", "level": 4}
                ],
                "items": [
                    {"abbr": "LEAD", "amount": 1}
                ],
                "flags": ["behind"],
                "combatSpell": "FIRE"
            },
            {
                "items": [
                    {"abbr": "HDWA", "amount": 150}
                ],
                "skills": [
                    {"abbr": "COMB", "level": 5}
                ]
            }
        ],
        "defenders": [
            {
                "items": [
                    {"abbr": "KONG", "amount": 2},
                    {"abbr": "SKEL", "amount": 2}
                ]
            }
        ]
    }`);

    const child = spawn(path.join(__dirname, '../../src/engine/engine'), ['battle', filePath]);

    let data = '';
    for await (const buffer of child.stdout) {
        data += buffer.toString();
    }

    unlinkSync(filePath);

    res.send(data);
});

// start the express server
app.listen(port, () => {
    console.log(`server started on port ${port}`);
});
