import React, {createContext, PropsWithChildren, useContext, useEffect, useState} from 'react';
import {useStore} from 'react-redux';
import {Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {AppStore} from '../store';
import {BaselineV1, captureDraft, isBaseline, isDraft, STORAGE_KEYS, StoragePort, StoredRecord} from '../persistence';
import {realNumber} from '../utils';

type Session = {
    baseline?: BaselineV1
    pin: (value: BaselineV1) => void
    restore: () => void
    remove: () => void
    warning: string
    status: string
};
const Context = createContext<Session | undefined>(undefined);
const browserStorage = () => window.localStorage;

export function LocalPersistence({children, storage = browserStorage}: PropsWithChildren<{storage?: () => StoragePort}>) {
    const store = useStore() as AppStore;
    const [session, setSession] = useState<Session>();

    useEffect(() => {
        const draft = new StoredRecord(storage, STORAGE_KEYS.draft, isDraft);
        const baseline = new StoredRecord(storage, STORAGE_KEYS.baseline, isBaseline);
        let enabled = !/^\/b\//.test(window.location.pathname);
        if (enabled && draft.value) store.dispatch({type: 'session/restoreDraft', payload: draft.value});
        let last = JSON.stringify(captureDraft(store.getState()));
        let timer: ReturnType<typeof setTimeout>;
        let pending = false;
        let status = enabled ? (draft.value ? 'Draft restored. Changes save in this browser.' : 'Changes save automatically in this browser.') : 'Shared battle: your local draft is kept untouched.';

        const publish = () => setSession({
            baseline: baseline.value,
            warning: [draft.warning && `Draft: ${draft.warning}`, baseline.warning && `Baseline: ${baseline.warning}`].filter(Boolean).join(' '),
            status,
            pin: value => {
                if (baseline.save(value)) status = 'Baseline saved in this browser.';
                publish();
            },
            remove: () => {
                if (baseline.remove()) status = 'Baseline removed. Your draft is unchanged.';
                publish();
            },
            restore: () => {
                if (!baseline.value) return;
                enabled = true;
                window.history.replaceState({}, '', '/');
                store.dispatch({type: 'session/restoreDraft', payload: baseline.value.setup});
                pending = true;
                flush();
            },
        });
        const flush = () => {
            clearTimeout(timer);
            if (!pending || !enabled) return;
            pending = false;
            if (draft.save(captureDraft(store.getState()))) status = 'Draft saved in this browser.';
            publish();
        };
        const unsubscribe = store.subscribe(() => {
            const next = JSON.stringify(captureDraft(store.getState()));
            if (!enabled || next === last) return;
            last = next;
            pending = true;
            status = 'Saving draft…';
            publish();
            clearTimeout(timer);
            timer = setTimeout(flush, 300);
        });
        publish();
        window.addEventListener('pagehide', flush);
        const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            unsubscribe();
            window.removeEventListener('pagehide', flush);
            document.removeEventListener('visibilitychange', onVisibility);
            flush();
            clearTimeout(timer);
        };
    }, [store, storage]);

    if (!session) return null;
    return <Context.Provider value={session}>{children}</Context.Provider>;
}

export function DraftStatus() {
    const session = useContext(Context);
    if (!session) return null;
    return <Typography component="div" variant="caption" sx={{color: 'inherit', opacity: 0.8, lineHeight: 1.5}}>
        {session.warning ? 'Browser storage needs attention' : session.status}
    </Typography>;
}

export function PersistenceWarning() {
    const session = useContext(Context);
    return session?.warning ? <Alert severity="warning" sx={{mb: 2}}>{session.warning}</Alert> : null;
}

export function BaselineComparison({current, onRestore, busy = false}: {current?: BaselineV1, onRestore: () => void, busy?: boolean}) {
    const session = useContext(Context);
    const [confirm, setConfirm] = useState(false);
    const [expanded, setExpanded] = useState(!!session?.baseline);
    useEffect(() => { setExpanded(!!session?.baseline); }, [session?.baseline]);
    if (!session) return null;
    const baseline = session.baseline;
    const delta = (a: number, b: number) => `${b > a ? '+' : ''}${realNumber(b - a)}`;
    const count = (value: BaselineV1) => value.result.wins + value.result.draws + value.result.losses;
    const rows = baseline && current
        ? [
            ['Attacker win rate', `${realNumber(baseline.result.winRate)}%`, `${realNumber(current.result.winRate)}%`, `${delta(baseline.result.winRate, current.result.winRate)} pp`],
            ['Average attacker casualties', realNumber(baseline.result.attackerMean), realNumber(current.result.attackerMean), delta(baseline.result.attackerMean, current.result.attackerMean)],
            ['Average defender casualties', realNumber(baseline.result.defenderMean), realNumber(current.result.defenderMean), delta(baseline.result.defenderMean, current.result.defenderMean)],
            ['Simulations', String(count(baseline)), String(count(current)), delta(count(baseline), count(current))],
        ]
        : [];
    if (!baseline && !current) return null;
    return <>
        <Accordion expanded={expanded} onChange={(_event, open) => setExpanded(open)} disableGutters
            elevation={0} variant="outlined" sx={{mt: 2, '&::before': {display: 'none'}}}>
            <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                <Typography variant="body2" color="text.secondary">{baseline ? 'Baseline comparison · Pinned' : 'Compare battle results with baseline'}</Typography>
            </AccordionSummary>
            <AccordionDetails>
                {baseline && <Typography variant="body2" color="text.secondary">
            Baseline from {new Date(baseline.completedAt).toLocaleString()} · {count(baseline)} simulations
                </Typography>}
                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1, my: 2}}>
                    {current && <Button onClick={() => session.pin(current)}>{baseline ? 'Replace baseline with this result' : 'Pin as baseline'}</Button>}
                    {baseline && <Button disabled={busy} onClick={() => setConfirm(true)}>Restore baseline setup</Button>}
                    {baseline && <Button onClick={session.remove}>Remove baseline</Button>}
                </Box>
                {rows.length > 0
                    ? <>
                        <TableContainer><Table size="small" aria-label="Baseline comparison">
                            <TableHead><TableRow>{['Metric', 'Baseline', 'Current', 'Change'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
                            <TableBody>{rows.map(row => <TableRow key={row[0]}>{row.map((value, index) => <TableCell key={index}>{value}</TableCell>)}</TableRow>)}</TableBody>
                        </Table></TableContainer>
                        <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>Results are estimates. Small differences may be random variation. Win-rate changes are percentage points (pp).</Typography>
                    </>
                    : baseline && <Typography>Run a battle to compare it with your pinned baseline.</Typography>}
            </AccordionDetails>
        </Accordion>
        <Dialog open={confirm} onClose={() => setConfirm(false)} aria-labelledby="restore-baseline-title">
            <DialogTitle id="restore-baseline-title">Restore baseline setup?</DialogTitle>
            <DialogContent>This replaces your current armies, unfinished unit edits, and simulation count.</DialogContent>
            <DialogActions><Button onClick={() => setConfirm(false)}>Cancel</Button><Button onClick={() => {
                session.restore(); onRestore(); setConfirm(false);
            }}>Restore</Button></DialogActions>
        </Dialog>
    </>;
}
