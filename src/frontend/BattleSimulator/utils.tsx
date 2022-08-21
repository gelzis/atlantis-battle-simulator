import {Provider} from 'react-redux';
import React, {PureComponent} from 'react';
import {createStore} from 'redux';
import {StylesProvider} from '@material-ui/core/styles';

import {reducer} from './reducer';
import {Rule, StyleSheet} from 'jss';

const store = createStore(reducer);
const generateClassName = (rule:Rule, styleSheet: StyleSheet): string => `${styleSheet.options.classNamePrefix}-${rule.key}`;

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

export class WrapperForTests extends PureComponent {
    render() {
        return <Provider store={store}><StylesProvider generateClassName={generateClassName}>{this.props.children}</StylesProvider></Provider>;
    }
}
