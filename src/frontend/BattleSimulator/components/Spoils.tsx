import { makeStyles, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@material-ui/core';
import React from 'react';
import { ItemStatRecord } from '../types';
import { percent, realNumber } from '../utils';
import PercentileGraph from './PercentileGraph';

export interface SpoilsProps {
    runs: number;
    items: ItemStatRecord[];
}

const useStyles = makeStyles({
    cell: {
        textAlign: 'right'
    },
    percentile: {
        paddingTop: '2px',
    }
});

export default function Spoils({ runs, items }: SpoilsProps) {
    const classes = useStyles();

    const sortedItems: ItemStatRecord[] = React.useMemo(() => {
        const arr = [...items];
        arr.sort((a, b) => b.occurance - a.occurance);
        return arr;
    }, [ items ])

    return <TableContainer>
        <Table size='small' stickyHeader>
            <TableHead>
                <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell className={classes.cell}>Occurance</TableCell>
                    <TableCell className={classes.cell}>Min</TableCell>
                    <TableCell className={classes.cell}>Max</TableCell>
                    <TableCell className={classes.cell}>Mean</TableCell>
                    <TableCell className={classes.cell}>Median</TableCell>
                    <TableCell className={classes.cell}>Mode</TableCell>
                    <TableCell className={classes.cell}>StdDev</TableCell>
                    <TableCell className={classes.cell}>Percentiles</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                { sortedItems.map(x => <TableRow key={x.item} hover>
                    <TableCell>{x.item}</TableCell>
                    <TableCell className={classes.cell}>{percent(x.occurance / runs)}</TableCell>
                    <TableCell className={classes.cell}>{realNumber(x.min)}</TableCell>
                    <TableCell className={classes.cell}>{realNumber(x.max)}</TableCell>
                    <TableCell className={classes.cell}>{realNumber(x.mean)}</TableCell>
                    <TableCell className={classes.cell}>{realNumber(x.median)}</TableCell>
                    <TableCell className={classes.cell}>{realNumber(x.mode)}</TableCell>
                    <TableCell className={classes.cell}>{realNumber(x.stdDev)}</TableCell>
                    <TableCell className={classes.percentile}>
                        <PercentileGraph items={x.percentile} />
                    </TableCell>
                </TableRow> ) }
            </TableBody>
        </Table>
    </TableContainer>
}