import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import posthog from 'posthog-js';

import {BattleSimulator} from './components/BattleSimulator';
import {GlobalStyle} from '../GlobalStyle';
import {store} from './store';

if (process.env.NODE_ENV === 'production') {
    posthog.init('phc_34VjYKBvvWQqvK4TLQHvGPvUBON8AaWFdV52EiJx0e6', {api_host: 'https://eu.posthog.com'});
}

ReactDOM.render(
    <Provider store={store}>
        <GlobalStyle/>
        <BattleSimulator/>
    </Provider>,
    document.getElementById('app'),
);
