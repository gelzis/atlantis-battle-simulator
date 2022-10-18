import {Typography} from '@material-ui/core';
import styled from 'styled-components';
import React from 'react';
import {StatRecord} from '../types';
import PercentileGraph from './PercentileGraph';
import {percent, realNumber} from '../utils';

export interface StatsProps extends StatRecord {
    runs: number
}

const StatsContainer = styled.div`
    display: flex;
    gap: 8px;
`;

export default function Stats({runs, occurance, min, max, mean, median, mode, stdDev, percentile}: StatsProps) {
    const expectedFrom = Math.trunc(Math.max(0, mean - stdDev));
    const expectedTo = Math.trunc(mean + stdDev);

    const expected = <Typography>{realNumber(expectedFrom)}&mdash;{realNumber(expectedTo)}</Typography>;

    return <StatsContainer>
        <StatValue title='Occurance' value={percent(occurance / runs)} />
        <StatValue title='Expected' value={expected} />
        <StatValue title='Min' value={realNumber(min)} />
        <StatValue title='Max' value={realNumber(max)} />
        <StatValue title='Mean' value={realNumber(mean)} />
        <StatValue title='Median' value={realNumber(median)} />
        <StatValue title='Mode' value={realNumber(mode)} />
        <StatValue title='StdDev' value={realNumber(stdDev)} />
        <StatValue title='Percentiles' value={<PercentileGraph items={percentile} />} />
    </StatsContainer>;
}

interface StatValueProps {
    title: string
    value: React.ReactNode
}

function StatValue({title, value}: StatValueProps) {
    return <div>
        <Typography variant='caption'>{title}</Typography>
        { (typeof value === 'string' || typeof value === 'number')
            ? <Typography>{value}</Typography>
            : value
        }
    </div>;
}
