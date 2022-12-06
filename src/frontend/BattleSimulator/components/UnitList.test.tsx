import React from 'react';
import {render, fireEvent, screen} from '@testing-library/react';

import {BattleSimulator} from './BattleSimulator';
import {WrapperForTests} from '../utils';

it('allows to set unit behind from unit list', () => {
    const {asFragment} = render(<WrapperForTests><BattleSimulator/></WrapperForTests>);

    fireEvent.click(screen.getByText('Add to Attackers'));
    fireEvent.click(screen.getByTestId('set-behind').querySelector('input[type="checkbox"]'));

    expect(asFragment()).toMatchSnapshot();
});
