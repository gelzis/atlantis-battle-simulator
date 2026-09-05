import React, {FC, useId, useState} from 'react';
import {
    Accordion, AccordionDetails, AccordionSummary, Box, Grid, LinearProgress,
    Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import {ServerSimulationResponse} from '../types';
import {StyledPaper} from '../../StyledComponents';
import {realNumber} from '../utils';
import Spoils from './Spoils';
import Stats from './Stats';

type BattleLog = {label: string, text: string};

const BattleLogs = ({logs}: {logs: BattleLog[]}) => {
    const [selected, setSelected] = useState<string>();
    const id = useId();
    const active = logs.find(log => log.label === selected) || logs[0];

    return <>
        <Tabs value={active.label} onChange={(_event, value: string) => setSelected(value)}
            aria-label="Example battle outcomes" variant="scrollable" scrollButtons="auto">
            {logs.map(log => <Tab key={log.label} label={log.label} value={log.label}
                id={`${id}-${log.label}-tab`} aria-controls={`${id}-${log.label}-panel`}/>)}
        </Tabs>
        <Box role="tabpanel" id={`${id}-${active.label}-panel`} aria-labelledby={`${id}-${active.label}-tab`}
            tabIndex={0} sx={{mt: 2}}>
            <Box component="pre" sx={{
                m: 0,
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
            }}>
                {active.text}
            </Box>
        </Box>
    </>;
};

export const SimulationResult: FC<ServerSimulationResponse> = ({
    wins, loses, draws, winRatio, victoryBattleText, drawBattleText, lossBattleText,
    attackerLooses, defenderLooses, spoils,
}: ServerSimulationResponse) => {
    const runs = wins + loses + draws;
    const displayedRatio = runs > 0 ? winRatio : 0;
    const logs = [
        {label: 'Victory', text: victoryBattleText},
        {label: 'Draw', text: drawBattleText},
        {label: 'Defeat', text: lossBattleText},
    ].filter(log => !!log.text);
    const casualties = [
        {label: 'Average per battle', attacker: realNumber(attackerLooses.mean), defender: realNumber(defenderLooses.mean)},
        {label: 'Median', attacker: realNumber(attackerLooses.median), defender: realNumber(defenderLooses.median)},
        {
            label: 'Minimum–maximum',
            attacker: `${realNumber(attackerLooses.min)}–${realNumber(attackerLooses.max)}`,
            defender: `${realNumber(defenderLooses.min)}–${realNumber(defenderLooses.max)}`,
        },
    ];

    return (
        <StyledPaper elevation={3} sx={{mt: 2, p: {xs: 2, sm: 3}}}>
            <Box sx={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap'}}>
                <Typography component="h2" variant="h5">Battle results</Typography>
                <Typography variant="body2" color="text.secondary">{runs} {runs === 1 ? 'simulation' : 'simulations'}</Typography>
            </Box>
            <Box sx={{my: 3}}>
                <Typography component="div" variant="overline">Attacker win rate</Typography>
                <Typography component="div" variant="h3" sx={{fontVariantNumeric: 'tabular-nums', mb: 1}}>
                    {displayedRatio.toFixed(2)}%
                </Typography>
                <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, displayedRatio))}
                    aria-label="Attacker win rate" sx={{height: 10, borderRadius: 5}}/>
                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1.5}}>
                    <Typography>{wins} wins</Typography>
                    <Typography>{draws} draws</Typography>
                    <Typography>{loses} losses</Typography>
                </Box>
            </Box>

            <TableContainer sx={{mb: 3}}>
                <Table size="small" aria-label="Casualty comparison"
                    sx={{'& th, & td': {px: {xs: 1, sm: 2}, py: 1.5}, '& td': {fontVariantNumeric: 'tabular-nums'}}}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Casualties</TableCell>
                            <TableCell align="right">Attacker</TableCell>
                            <TableCell align="right">Defender</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {casualties.map(row => <TableRow key={row.label}>
                            <TableCell component="th" scope="row">{row.label}</TableCell>
                            <TableCell align="right">{row.attacker}</TableCell>
                            <TableCell align="right">{row.defender}</TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
            </TableContainer>

            <Accordion disableGutters elevation={0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon/>}>Detailed casualty statistics</AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={3}>
                        <Grid size={{xs: 12, sm: 6}}>
                            <Typography component="h3" variant="subtitle1">Attacker</Typography>
                            <Stats runs={runs} {...attackerLooses}/>
                        </Grid>
                        <Grid size={{xs: 12, sm: 6}}>
                            <Typography component="h3" variant="subtitle1">Defender</Typography>
                            <Stats runs={runs} {...defenderLooses}/>
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {spoils.length > 0 && <Accordion disableGutters elevation={0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon/>}>Spoils</AccordionSummary>
                <AccordionDetails><Spoils runs={runs} items={spoils}/></AccordionDetails>
            </Accordion>}

            {logs.length > 0 && <Accordion disableGutters elevation={0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon/>}>Example battle logs</AccordionSummary>
                <AccordionDetails><BattleLogs logs={logs}/></AccordionDetails>
            </Accordion>}
        </StyledPaper>
    );
};
