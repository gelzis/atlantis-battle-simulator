import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {createStore} from 'redux';

import {BattleSimulator} from './BattleSimulator';
import {GlobalStyle} from './GlobalStyle';
import {reducer} from './reducer';
const store = createStore(reducer);
ReactDOM.render(
    <Provider store={store}>
        <GlobalStyle/>
        <BattleSimulator/>
    </Provider>,
    document.getElementById('app'),
);
