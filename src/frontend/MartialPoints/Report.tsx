import React, {useCallback} from 'react';
import styled from 'styled-components';
import TableContainer from '@material-ui/core/TableContainer';
import {theme} from '../StyledComponents';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableBody from '@material-ui/core/TableBody';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';

import {MartialPointData} from './OrderParser';

const ResetLink = styled.a`
    position: absolute;
    left: 15px;
    top: 15px;
    color: #000000;
`;

export function Report({martialPointData, onReset}: {martialPointData: MartialPointData, onReset: () => void}) {
    const onResetHandler = useCallback((e) => {
        e.preventDefault();

        onReset();
    }, []);

    return (
        <div>
            <h3>{`Region count: ${martialPointData.count}`}</h3>
            <TableContainer css={`margin-top:  ${theme.spacing(1)}px`} component={Paper}>
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
