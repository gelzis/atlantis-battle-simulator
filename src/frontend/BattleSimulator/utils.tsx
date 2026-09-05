import {Provider} from 'react-redux';
import React, {PropsWithChildren, PureComponent} from 'react';
import {ThemeProvider} from '@mui/material/styles';

import {createAppStore} from './store';
import {theme} from '../StyledComponents';

export function download(text: string, filename: string): void {
    const blob = new Blob(
        [text],
        {
            type: 'application/json',
        },
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

export class WrapperForTests extends PureComponent<PropsWithChildren> {
    private readonly store = createAppStore();

    render() {
        return <Provider store={this.store}><ThemeProvider theme={theme}>{this.props.children}</ThemeProvider></Provider>;
    }
}

export function realNumber(value: number) {
    return value.toLocaleString('en-US', {maximumFractionDigits: 2, useGrouping: true}).replace(/,/g, ' ');
}

export function percent(value: number) {
    return value.toLocaleString(undefined, {style: 'percent', maximumFractionDigits: 0});
}
