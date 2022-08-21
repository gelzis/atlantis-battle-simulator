import React from 'react';
import {render, fireEvent, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {BattleSimulator} from './BattleSimulator';
import {download, WrapperForTests} from '../utils';
import Mock = jest.Mock;

jest.mock('../utils', () => {
    const actual = jest.requireActual('../utils');

    return {
        ...actual,
        download: jest.fn(),
    };
});

it('allows to get json download of the units', () => {
    render(<WrapperForTests><BattleSimulator/></WrapperForTests>);

    fireEvent.click(screen.getByTestId('add-to-attackers'));
    fireEvent.click(screen.getByTestId('add-to-defenders'));
    fireEvent.click(screen.getByTestId('download-json'));

    expect((download as Mock).mock.calls.length).toBe(1);
    expect((download as Mock).mock.calls[0][0]).toBe('{"attackers":{"units":[{"name":"Unit","skills":[],"items":[{"abbr":"LEAD","amount":1}]}]},"defenders":{"units":[{"name":"Unit","skills":[],"items":[{"abbr":"LEAD","amount":1}]}]}}');
});

it('allows json upload of the units', async() => {
    const user = userEvent.setup({
        applyAccept: false,
    });
    const {asFragment} = render(<WrapperForTests><BattleSimulator/></WrapperForTests>);

    const str = '{"attackers":{"units":[{"name":"hell yeah","skills":[],"items":[{"abbr":"LEAD","amount":2}]}]},"defenders":{"units":[{"name":"Unit","skills":[],"items":[{"abbr":"LEAD","amount":1}]}]}}';
    const blob = new Blob([str]);
    const file = new File([blob], 'battle.json', {
        type: 'application/JSON',
    });
    const input = screen.getByTestId('json-upload-input');
    await user.upload(input, file);

    expect(asFragment()).toMatchSnapshot();
});
