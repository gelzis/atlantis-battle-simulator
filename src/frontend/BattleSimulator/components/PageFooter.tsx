import React, {FC} from 'react';
import {Typography} from '@mui/material';

import {theme} from '../../StyledComponents';
import GitHubIcon from '@mui/icons-material/GitHub';
import styled from 'styled-components';

const Footer = styled(Typography)`
    text-align: center;
    padding: ${theme.spacing(2)} 0;
`;

export const PageFooter: FC = () => {
    return (
        <Footer variant="body2">
            Copyright © Raivis Gelsbergs {`${new Date().getFullYear()}`}. <br/>
            Report bugs on <a target="_blank" rel="noopener noreferrer" href="https://github.com/gelzis/atlantis-battle-simulator">GitHub</a> or contact me in the <a target="_blank" rel="noopener noreferrer" href="https://discord.gg/wSvPT9x8NT">Atlantis PBEM Discord</a>. <br/>
            <a style={{color: '#000000'}} target="_blank" rel="noopener noreferrer" href="https://github.com/gelzis/atlantis-battle-simulator">
                <GitHubIcon color="inherit"/>
            </a>
        </Footer>
    );
};
