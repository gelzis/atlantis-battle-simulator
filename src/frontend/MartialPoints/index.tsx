import React from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '@mui/material/styles';
import {theme} from '../StyledComponents';

import {GlobalStyle} from '../GlobalStyle';
import {MartialPoints} from './MartialPoints';
const container = document.getElementById('app');
if (!container) throw new Error('Missing app container');

createRoot(container).render(
    <ThemeProvider theme={theme}>
        <GlobalStyle/>
        <MartialPoints/>
    </ThemeProvider>,
);
