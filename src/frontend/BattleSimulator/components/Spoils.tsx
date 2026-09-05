import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from '@mui/material';
import React from 'react';
import {ItemStatRecord} from '../types';
import {percent, realNumber} from '../utils';
import PercentileGraph from './PercentileGraph';

export interface SpoilsProps {
    runs: number
    items: ItemStatRecord[]
}

export default function Spoils({runs, items}: SpoilsProps) {
    const sortedItems: ItemStatRecord[] = React.useMemo(() => {
        const arr = [...items];
        arr.sort((a, b) => b.occurance - a.occurance);
        return arr;
    }, [items]);

    return <TableContainer>
        <Table size='small' stickyHeader>
            <TableHead>
                <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Occurrence</TableCell>
                    <TableCell align="right">Expected</TableCell>
                    <TableCell align="right">Min</TableCell>
                    <TableCell align="right">Max</TableCell>
                    <TableCell align="right">Mean</TableCell>
                    <TableCell align="right">Median</TableCell>
                    <TableCell align="right">Mode</TableCell>
                    <TableCell align="right">StdDev</TableCell>
                    <TableCell align="right">Percentiles</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                { sortedItems.map(x => {
                    const expectedFrom = Math.trunc(Math.max(0, x.mean - x.stdDev));
                    const expectedTo = Math.trunc(x.mean + x.stdDev);

                    return <TableRow key={x.item} hover>
                        <TableCell>{x.item}</TableCell>
                        <TableCell align="right">{percent(x.occurance / runs)}</TableCell>
                        <TableCell align="right">{realNumber(expectedFrom)}&mdash;{realNumber(expectedTo)}</TableCell>
                        <TableCell align="right">{realNumber(x.min)}</TableCell>
                        <TableCell align="right">{realNumber(x.max)}</TableCell>
                        <TableCell align="right">{realNumber(x.mean)}</TableCell>
                        <TableCell align="right">{realNumber(x.median)}</TableCell>
                        <TableCell align="right">{realNumber(x.mode)}</TableCell>
                        <TableCell align="right">{realNumber(x.stdDev)}</TableCell>
                        <TableCell sx={{paddingTop: '2px'}}>
                            <PercentileGraph items={x.percentile} />
                        </TableCell>
                    </TableRow>;
                }) }
            </TableBody>
        </Table>
    </TableContainer>;
}
