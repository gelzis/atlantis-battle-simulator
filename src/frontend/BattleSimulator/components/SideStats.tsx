import React from 'react';
import {Typography} from '@mui/material';

import {theme} from '../../StyledComponents';
import styled from 'styled-components';
import {SideStats as SideStatsType} from '../types';

type SideStatsProps = {
    stats: SideStatsType
}

export const Formation = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing(2)};
  margin-bottom: ${theme.spacing(2)};
`;

export const FormationItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${theme.spacing(0.75)};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
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
