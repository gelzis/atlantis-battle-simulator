import React, {useCallback} from 'react';
import styled from 'styled-components';
import TableContainer from '@mui/material/TableContainer';
import {theme} from '../StyledComponents';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import {MartialPointData} from './OrderParser';

const ResetLink = styled.a`
    position: absolute;
    left: 15px;
    top: 15px;
    color: #000000;
`;

export function Report({martialPointData, onReset}: {martialPointData: MartialPointData, onReset: () => void}) {
    const onResetHandler = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        onReset();
    }, [onReset]);

    return (
        <div>
            <h3>{`Region count: ${martialPointData.count}`}</h3>
            <TableContainer css={`margin-top:  ${theme.spacing(1)}`} component={Paper}>
                <Table size="small" aria-label="a dense table">
                    <TableHead>
                        <TableRow>
                            <TableCell align="left">Region</TableCell>
                            <TableCell align="left">Tax</TableCell>
                            <TableCell align="left">Produce</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {martialPointData.regions.map((hex) => (
                            <TableRow key={hex.coords}>
                                <TableCell align="left">
                                    {hex.coords}
                                </TableCell>
                                <TableCell align="left">
                                    {hex.tax ? 'yes' : 'no'}
                                </TableCell>
                                <TableCell align="left">
                                    {hex.produce ? 'yes' : 'no'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <ResetLink href="" onClick={onResetHandler}><ArrowBackIcon/></ResetLink>
        </div>
    );
}
