import React from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '@mui/material/styles';
import {Provider} from 'react-redux';
import posthog from 'posthog-js';

import {BattleSimulator} from './components/BattleSimulator';
import {GlobalStyle} from '../GlobalStyle';
import {store} from './store';
import {theme} from '../StyledComponents';

if (process.env.NODE_ENV === 'production') {
    posthog.init('phc_34VjYKBvvWQqvK4TLQHvGPvUBON8AaWFdV52EiJx0e6', {api_host: 'https://eu.posthog.com'});
}

const container = document.getElementById('app');
if (!container) throw new Error('Missing app container');

createRoot(container).render(
    <Provider store={store}>
        <ThemeProvider theme={theme}>
            <GlobalStyle/>
            <BattleSimulator/>
        </ThemeProvider>
    </Provider>,
);
