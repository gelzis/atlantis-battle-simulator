import express from 'express';
import path from 'path';

const app = express();
const port = process.env.PORT || 4020; // default port to listen

console.log(path.join(__dirname, '../dist/main.js'));

app.use('/dist/main.js', express.static(path.join(__dirname, '../public/dist/main.js'), {cacheControl: false}));
app.use('/', express.static(path.join(__dirname, '../public')));

// start the express server
app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started on port ${port}`);
});
