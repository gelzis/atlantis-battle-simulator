import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';

import {BattleSimulator} from './components/BattleSimulator';
import {GlobalStyle} from '../GlobalStyle';
import {store} from './store';

ReactDOM.render(
    <Provider store={store}>
        <GlobalStyle/>
        <BattleSimulator/>
    </Provider>,
    document.getElementById('app'),
);
