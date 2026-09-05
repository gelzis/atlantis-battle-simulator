import {Tooltip, Typography} from '@mui/material';
import styled from 'styled-components';
import React from 'react';
import {StatRecord} from '../types';
import PercentileGraph from './PercentileGraph';
import {percent, realNumber} from '../utils';

export interface StatsProps extends StatRecord {
    runs: number
}

const StatsContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
    gap: 16px;
    margin-top: 8px;
`;

const StatContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
    font-variant-numeric: tabular-nums;
`;

const StatContent = styled.div`
    white-space: nowrap;
`;

export default function Stats({runs, occurance, min, max, mean, median, mode, stdDev, percentile}: StatsProps) {
    const expectedFrom = Math.trunc(Math.max(0, mean - stdDev));
    const expectedTo = Math.trunc(mean + stdDev);

    const expected = `${realNumber(expectedFrom)}–${realNumber(expectedTo)}`;

    return <StatsContainer>
        <StatValue title='Occurrence' description='Share of simulations with casualties on this side.' value={percent(runs > 0 ? occurance / runs : 0)} />
        <StatValue title='Expected' description='Mean plus or minus one standard deviation, rounded down and bounded at zero. This is a descriptive range, not a guarantee.' value={expected} />
        <StatValue title='Min' value={realNumber(min)} />
        <StatValue title='Max' value={realNumber(max)} />
        <StatValue title='Mean' description='Average casualties per simulation.' value={realNumber(mean)} />
        <StatValue title='Median' description='Middle casualty count when simulation results are sorted.' value={realNumber(median)} />
        <StatValue title='Mode' description='Most frequent casualty count.' value={realNumber(mode)} />
        <StatValue title='Std. dev.' description='How much casualty counts vary around the average.' value={realNumber(stdDev)} />
        <StatValue title='Percentiles' description='Casualty thresholds across the distribution. Hover over a bar for its percentile and value.' value={<PercentileGraph items={percentile} />} />
    </StatsContainer>;
}

interface StatValueProps {
    title: string
    value: React.ReactNode
    description?: string
}

function StatValue({title, value, description}: StatValueProps) {
    return <StatContainer>
        <Tooltip title={description || ''} describeChild>
            <Typography variant='caption' color='text.secondary' tabIndex={description ? 0 : undefined}
                sx={description ? {textDecoration: 'underline dotted', textUnderlineOffset: '3px', cursor: 'help'} : undefined}>{title}</Typography>
        </Tooltip>
        <StatContent>
            { (typeof value === 'string' || typeof value === 'number')
                ? <Typography>{value}</Typography>
                : value
            }
        </StatContent>
    </StatContainer>;
}
