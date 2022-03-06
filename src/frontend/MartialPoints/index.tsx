import React from 'react';
import ReactDOM from 'react-dom';

import {GlobalStyle} from '../GlobalStyle';
import {MartialPoints} from './MartialPoints';
ReactDOM.render(
    <>
        <GlobalStyle/>
        <MartialPoints/>
    </>,
    document.getElementById('app'),
);
