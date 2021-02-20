import React, {FC} from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import {Tooltip} from '@material-ui/core';

import {Unit} from './types';
import {theme} from './StyledComponents';

type UnitItemProps = {
    units: Unit[]
    onEdit: (id: string) => void
    onDelete: (id: string) => void
    onDuplicate: (id: string) => void
};

export const UnitList: FC<UnitItemProps> = ({units, onDuplicate, onEdit, onDelete}: UnitItemProps): JSX.Element => {
    return (
        <TableContainer css={`margin-top:  ${theme.spacing(1)}px`} component={Paper}>
            <Table size="small" aria-label="a dense table">
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell align="left">Items</TableCell>
                        <TableCell align="left">Skills</TableCell>
                        <TableCell align="left">Behind</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {units.map((unit) => (
                        <TableRow key={unit.id}>
                            <TableCell component="th" scope="row">
                                {unit.name}
                            </TableCell>
                            <TableCell align="left">
                                {unit.items.map((item) => {
                                    return <div key={item.id}>{`${item.amount} [${item.abbr}]`}</div>;
                                })}
                            </TableCell>
                            <TableCell align="left">
                                {unit.skills.map((skill) => {
                                    return <div key={skill.id}>{`${skill.abbr} ${skill.level} ${skill.abbr === unit.combatSpell ? '(C)' : ''}`}</div>;
                                })}
                            </TableCell>
                            <TableCell align="left">
                                {unit.behind ? 'yes' : 'no'}
                            </TableCell>
                            <TableCell align="right">
                                <Tooltip title="Edit">
                                    <EditIcon
                                        onClick={onEdit.bind(null, unit.id)}
                                        fontSize={'small'}
                                        css={'cursor: pointer'}
                                    />
                                </Tooltip>
                                <Tooltip title="Duplicate">
                                    <FileCopyIcon
                                        css={'cursor: pointer'}
                                        onClick={onDuplicate.bind(null, unit.id)}
                                        fontSize={'small'}
                                    />
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <DeleteIcon
                                        css={'cursor: pointer'}
                                        onClick={onDelete.bind(null, unit.id)}
                                        fontSize={'small'}
                                    />
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
