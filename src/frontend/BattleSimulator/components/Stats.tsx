import {Typography} from '@mui/material';
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
        <StatValue title='Occurrence' value={percent(occurance / runs)} />
        <StatValue title='Expected' value={expected} />
        <StatValue title='Min' value={realNumber(min)} />
        <StatValue title='Max' value={realNumber(max)} />
        <StatValue title='Mean' value={realNumber(mean)} />
        <StatValue title='Median' value={realNumber(median)} />
        <StatValue title='Mode' value={realNumber(mode)} />
        <StatValue title='Std. dev.' value={realNumber(stdDev)} />
        <StatValue title='Percentiles' value={<PercentileGraph items={percentile} />} />
    </StatsContainer>;
}

interface StatValueProps {
    title: string
    value: React.ReactNode
}

function StatValue({title, value}: StatValueProps) {
    return <StatContainer>
        <Typography variant='caption' color='text.secondary'>{title}</Typography>
        <StatContent>
            { (typeof value === 'string' || typeof value === 'number')
                ? <Typography>{value}</Typography>
                : value
            }
        </StatContent>
    </StatContainer>;
}
