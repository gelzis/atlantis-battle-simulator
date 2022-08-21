import React, {FC} from 'react';
import {Typography} from '@material-ui/core';

import {ServerSimulationResponse} from '../types';
import {StyledPaper, theme, StyledSideHeading} from '../../StyledComponents';

export const SimulationResult: FC<ServerSimulationResponse> = ({wins, loses, draws, winRatio, victoryBattleText, drawBattleText, lossBattleText}: ServerSimulationResponse) => {
    return (
        <StyledPaper css={`margin-top: ${theme.spacing(2)}px; white-space: pre-wrap;`} elevation={3}>
            <StyledSideHeading gutterBottom={true} variant="h5">
                {`Wins ${wins}. Draws: ${draws}. Loses ${loses}. Win ratio: ${winRatio.toFixed(2)}%`}
            </StyledSideHeading>

            {victoryBattleText &&
                <>
                    <StyledSideHeading variant="h6">
                        Victory example:
                    </StyledSideHeading>
                    <StyledPaper css={`margin-top: ${theme.spacing(2)}px; white-space: pre-wrap;`} elevation={3}>
                        <Typography variant="body2">
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
                        <Typography variant="body2">
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
                        <Typography variant="body2">
                            {lossBattleText}
                        </Typography>
                    </StyledPaper>
                </>
            }

        </StyledPaper>

    );
};
