import path from 'path';

import express from 'express';

const app = express();
const port = process.env.PORT || 4020;

console.log(path.join(__dirname, '../dist/main.js'));

app.use('/dist/main.js', express.static(path.join(__dirname, '../../src/public/dist/main.js'), {cacheControl: false}));
app.use('/', express.static(path.join(__dirname, '../../src/public')));

// start the express server
app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started on port ${port}`);
});
