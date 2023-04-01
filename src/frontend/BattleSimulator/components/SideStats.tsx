import React from 'react';
import {Typography} from '@material-ui/core';

import {theme} from '../../StyledComponents';
import styled from 'styled-components';
import {SideStats as SideStatsType} from '../types';

type SideStatsProps = {
    stats: SideStatsType
}

export const Formation = styled.div`
  display: flex;
  gap: ${theme.spacing(2)}px;
  margin-bottom: ${theme.spacing(2)}px;
`;

export const FormationItem = styled.div`
  
`;

export function SideStats({stats}: SideStatsProps) {
    return (
        <Formation>
            <FormationItem>
                <Typography variant="caption">Front</Typography>
                <Typography>{stats.front}</Typography>
            </FormationItem>
            <FormationItem>
                <Typography variant="caption">Back</Typography>
                <Typography>{stats.back}</Typography>
            </FormationItem>
            <FormationItem>
                <Typography variant="caption">Total</Typography>
                <Typography>{stats.total}</Typography>
            </FormationItem>
        </Formation>
    );
}
