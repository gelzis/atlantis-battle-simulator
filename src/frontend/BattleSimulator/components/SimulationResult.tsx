import React, {FC} from 'react';
import {Grid, Typography} from '@material-ui/core';

import {ServerSimulationResponse} from '../types';
import {StyledPaper, theme, StyledSideHeading, StyledPadlessPaper} from '../../StyledComponents';
import Spoils from './Spoils';
import Stats from './Stats';

export const SimulationResult: FC<ServerSimulationResponse> = ({
    wins, loses, draws, winRatio, victoryBattleText, drawBattleText, lossBattleText,
    attackerLooses, defenderLooses, spoils,
}: ServerSimulationResponse) => {
    const runs = wins + loses + draws;

    return (
        <StyledPaper css={`margin-top: ${theme.spacing(2)}px; white-space: pre-wrap;`} elevation={3}>
            <StyledSideHeading gutterBottom={true} variant="h5">
                {`Wins ${wins}. Draws: ${draws}. Loses ${loses}. Win ratio: ${winRatio.toFixed(2)}%`}
            </StyledSideHeading>

            <StyledSideHeading variant="h6">
                Looses Brekadown
            </StyledSideHeading>
            <StyledPaper css={`margin-top: ${theme.spacing(2)}px; white-space: pre-wrap;`} elevation={3}>
                <Grid container>
                    <Grid item xs={12} sm={6}>
                        <Typography variant='subtitle1'>Attacker</Typography>
                        <Stats runs={runs} {...attackerLooses} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant='subtitle1'>Defender</Typography>
                        <Stats runs={runs} {...defenderLooses} />
                    </Grid>
                </Grid>
            </StyledPaper>

            { spoils.length > 0 &&
                <>
                    <StyledSideHeading variant="h6">
                        Spoils
                    </StyledSideHeading>
                    <StyledPadlessPaper css={`margin-top: ${theme.spacing(2)}px; `} elevation={3} >
                        <Spoils runs={runs} items={spoils} />
                    </StyledPadlessPaper>
                </>
            }

            {victoryBattleText &&
                <>
                    <StyledSideHeading variant="h6">
                        Victory example:
                    </StyledSideHeading>
                    <StyledPaper css={`margin-top: ${theme.spacing(2)}px; white-space: pre-wrap;`} elevation={3}>
                        <Typography variant="body2" css='font-family: monospace;'>
                            {victoryBattleText}
                        </Typography>
                    </StyledPaper>
                </>
            }

            {drawBattleText &&
                <>
                    <StyledSideHeading variant="h6">
                        Draw example:
                    </StyledSideHeading>
                    <StyledPaper css={`margin-top: ${theme.spacing(2)}px; white-space: pre-wrap;`} elevation={3}>
                        <Typography variant="body2" css='font-family: monospace;'>
                            {drawBattleText}
                        </Typography>
                    </StyledPaper>
                </>
            }

            {lossBattleText &&
                <>
                    <StyledSideHeading variant="h6">
                        Loss example:
                    </StyledSideHeading>
                    <StyledPaper css={`margin-top: ${theme.spacing(2)}px; white-space: pre-wrap;`} elevation={3}>
                        <Typography variant="body2" css='font-family: monospace;'>
                            {lossBattleText}
                        </Typography>
                    </StyledPaper>
                </>
            }

        </StyledPaper>

    );
};
