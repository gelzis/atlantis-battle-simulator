import React, {FC} from 'react';
import {Typography} from '@material-ui/core';

import {theme} from '../../StyledComponents';
import GitHubIcon from '@material-ui/icons/GitHub';
import styled from 'styled-components';

const Footer = styled(Typography)`
    text-align: center;
    padding: ${theme.spacing(2)}px 0;
`;

export const PageFooter: FC = () => {
    return (
        <Footer variant="body2">
            Copyright © Raivis Gelsbergs {`${new Date().getFullYear()}`}. <br/>You can report bugs in <a target="_blank" href="https://github.com/gelzis/atlantis-battle-simulator">Github</a> and/or contact me on <a href="https://discord.gg/HusGETf">discord</a>, my name tag is Gelzis#9633. <br/>
            <a style={{color: '#000000'}} target="_blank" href="https://github.com/gelzis/atlantis-battle-simulator">
                <GitHubIcon color="inherit"/>
            </a>
        </Footer>
    );
};
