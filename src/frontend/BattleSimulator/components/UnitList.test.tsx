import React from 'react';
import {render, fireEvent, screen} from '@testing-library/react';

import {BattleSimulator} from './BattleSimulator';
import {WrapperForTests} from '../utils';

jest.mock('./PageFooter');

it('allows to set unit behind from unit list', () => {
    render(<WrapperForTests><BattleSimulator/></WrapperForTests>);

    fireEvent.click(screen.getByText('Add to Attackers'));
    const checkbox = screen.getByTestId('set-behind').querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);

    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
});
