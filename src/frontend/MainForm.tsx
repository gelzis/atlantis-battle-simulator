import React, {ChangeEvent, PureComponent, ReactNode} from 'react';
import {Dispatch} from 'redux';
import {connect} from 'react-redux';
import styled from 'styled-components';
import {
    TextField,
    Button,
    Tooltip,
    FormControlLabel,
    Switch,
    Slider,
    Grid,
    MenuItem,
    InputLabel,
    Select,
} from '@material-ui/core';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import CancelIcon from '@material-ui/icons/Cancel';
import Autocomplete from '@material-ui/lab/Autocomplete';
import SaveIcon from '@material-ui/icons/Save';

import {StyledHeading, StyledPaper, theme} from './StyledComponents';
import SkillList from '../engine/skills.json';
import ItemList from '../engine/items.json';
import {
    ADD_ITEM,
    ADD_SKILL,
    SAVE_UNIT,
    AppState,
    CHANGE_ITEM_ABBR,
    CHANGE_ITEM_AMOUNT,
    CHANGE_SKILL_ABBR,
    CHANGE_SKILL_LEVEL, RESET_FORM, SET_BEHIND, SET_UNITS_NAME,
    Side,
    Unit, SET_COMBAT_SPELL,
} from './types';

const ButtonGroup = styled.div`
  margin-top: ${theme.spacing(2)}px;
`;

const SectionHeaderContainer = styled.div`
  margin-bottom: ${theme.spacing(1)}px;
`;

type JsonSkill = {
    abbr: string
    name: string
    combatSpell?: boolean
}

type JsonItem = {
    abbr: string
    name: string
}

const SkillListSorted = SkillList.sort((a, b) => {
    if (a.name > b.name) {
        return 1;
    } else {
        return -1;
    }
});

const ItemListSorted = ItemList.sort((a, b) => {
    if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
    } else {
        return -1;
    }
});

type StateProps = {
    unit: Unit
};

type DispatchProps = {
    saveUnit: (side?: Side) => void
    addSkill: () => void
    addItem: () => void
    changeItemAbbr: (id: string, abbr: string, name: string) => void
    changeItemAmount: (id: string, amount: number) => void

    changeSkillAbbr: (id: string, abbr: string, name: string, combatSpell: boolean) => void
    changeSkillLevel: (id: string, skill: number) => void

    setBehind: (enabled: boolean) => void
    setUnitsName: (name: string) => void
    setCombatSpell: (attr: string) => void

    resetForm: () => void
};
type FormProps = StateProps & DispatchProps;

const mapStateToProps = (state: AppState): StateProps => ({
    unit: state.unit,
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
    saveUnit(side): void {
        dispatch({
            type: SAVE_UNIT,
            payload: {
                side,
            },
        });
    },
    addItem(): void {
        dispatch({
            type: ADD_ITEM,
        });
    },
    addSkill(): void {
        dispatch({
            type: ADD_SKILL,
        });
    },
    changeItemAbbr(id, abbr, name): void {
        dispatch({
            type: CHANGE_ITEM_ABBR,
            payload: {
                id,
                abbr,
                name,
            },
        });
    },
    changeItemAmount(id, amount): void {
        dispatch({
            type: CHANGE_ITEM_AMOUNT,
            payload: {
                id,
                amount,
            },
        });
    },
    changeSkillAbbr(id, abbr, name, combatSpell): void {
        dispatch({
            type: CHANGE_SKILL_ABBR,
            payload: {
                id,
                abbr,
                name,
                combatSpell,
            },
        });
    },
    changeSkillLevel(id, level): void {
        dispatch({
            type: CHANGE_SKILL_LEVEL,
            payload: {
                id,
                level,
            },
        });
    },
    setBehind(enabled): void {
        dispatch({
            type: SET_BEHIND,
            payload: {
                enabled,
            },
        });
    },
    resetForm(): void {
        dispatch({
            type: RESET_FORM,
            payload: {},
        });
    },
    setUnitsName(name): void {
        dispatch({
            type: SET_UNITS_NAME,
            payload: {
                name,
            },
        });
    },
    setCombatSpell(abbr): void {
        dispatch({
            type: SET_COMBAT_SPELL,
            payload: {
                abbr,
            },
        });
    },
});

class MainFormClass extends PureComponent<FormProps, null> {
    OnChangeItemAbbr = (itemId: string, event: ChangeEvent, object: JsonItem): void => {
        this.props.changeItemAbbr(itemId, object?.abbr, object?.name);
    };

    OnChangeItemAmount = (itemId: string, event: React.ChangeEvent<HTMLInputElement>): void => {
        const amount = parseInt(event.target.value.replace(/\D+/g, ''), 10);
        this.props.changeItemAmount(itemId, amount);
    };

    OnChangeSkillAbbr = (itemId: string, event: ChangeEvent, object: JsonSkill): void => {
        this.props.changeSkillAbbr(itemId, object?.abbr, object?.name, object?.combatSpell);
    };

    OnChangeSkillLevel = (itemId: string, event: ChangeEvent, value: number): void => {
        this.props.changeSkillLevel(itemId, value);
    };

    OnChangeBehind = (event: React.ChangeEvent<HTMLInputElement>): void => {
        this.props.setBehind(event.target.checked);
    };

    OnAddToAttackers = (): void => {
        this.props.saveUnit('attackers');
    };

    OnSave = (): void => {
        this.props.saveUnit();
    };

    OnAddToDefenders = (): void => {
        this.props.saveUnit('defenders');
    };

    OnUnitsNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
        this.props.setUnitsName(event.target.value);
    };

    OnCombatSpellSet = (event: ChangeEvent<HTMLInputElement>): void => {
        this.props.setCombatSpell(event.target.value);
    };

    render(): JSX.Element {
        const {unit, addItem, addSkill} = this.props;

        const combatSpells = unit.skills.filter((skill) => skill.combatSpell);

        return (
            <StyledPaper square elevation={3}>
                <StyledHeading css={'margin-top: 0'} variant="h5">
                    <SectionHeaderContainer>
                        Men/Items/Monsters <Tooltip title="Add new item"><AddCircleIcon onClick={addItem} css={'cursor: pointer'}/></Tooltip>
                    </SectionHeaderContainer>
                    {unit.items.map((item) => {
                        return (
                            <Grid key={item.id} container spacing={2}>
                                <Grid item md={4} xs={6}>
                                    <InputLabel shrink>
                                        Item
                                    </InputLabel>
                                    <Autocomplete
                                        data-id={item.id}
                                        options={ItemListSorted}
                                        onChange={this.OnChangeItemAbbr.bind(this, item.id)}
                                        getOptionLabel={(option: JsonItem): string => `${option.name} [${option.abbr}]`}
                                        getOptionSelected={(a, b): boolean => a.abbr === b.abbr}
                                        value={item.name ? {name: item.name, abbr: item.abbr} : null}
                                        size={'small'}
                                        renderInput={(params): ReactNode =>
                                            <TextField
                                                {...params}
                                                size="small"
                                                variant="outlined"
                                                css={`margin-bottom: ${theme.spacing(1)}px`}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item md={4} xs={6}>
                                    <InputLabel shrink>
                                        Amount
                                    </InputLabel>
                                    <TextField
                                        css={'width: 100%'}
                                        onChange={this.OnChangeItemAmount.bind(this, item.id)}
                                        name="name"
                                        autoComplete="off"
                                        value={item.amount}
                                        placeholder="1"
                                    />
                                </Grid>
                            </Grid>
                        );
                    })}
                </StyledHeading>
                <StyledHeading variant="h5">
                    <SectionHeaderContainer>
                        Skills <Tooltip title="Add new skill"><AddCircleIcon onClick={addSkill} css={'cursor: pointer'}/></Tooltip>
                    </SectionHeaderContainer>
                    {unit.skills.map((item) => {
                        return (
                            <Grid key={item.id} container spacing={2}>
                                <Grid item md={4} xs={6}>
                                    <InputLabel shrink>
                                        Skill
                                    </InputLabel>
                                    <Autocomplete
                                        options={SkillListSorted}
                                        onChange={this.OnChangeSkillAbbr.bind(this, item.id)}
                                        getOptionLabel={(option: JsonSkill): string => `${option.name} [${option.abbr}]`}
                                        getOptionSelected={(a, b): boolean => a.abbr === b.abbr}
                                        value={item.name ? {name: item.name, abbr: item.abbr} : null}
                                        renderInput={(params): ReactNode =>
                                            <TextField
                                                {...params}
                                                size="small"
                                                variant="outlined"
                                                css={`margin-bottom: ${theme.spacing(1)}px`}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item md={4} xs={6}>
                                    <InputLabel shrink>
                                        Level
                                    </InputLabel>
                                    <Slider
                                        step={1}
                                        onChange={this.OnChangeSkillLevel.bind(this, item.id)}
                                        value={item.level}
                                        marks={[{label: '1', value: 1}, {label: '2', value: 2}, {label: '3', value: 3}, {label: '4', value: 4}, {label: '5', value: 5}]}
                                        min={1}
                                        max={5}
                                        valueLabelDisplay="auto"
                                    />
                                </Grid>
                            </Grid>
                        );
                    })}
                </StyledHeading>
                <div>
                    {combatSpells.length > 0 &&
                        <Grid container spacing={1}>
                            <Grid item xs={4}>
                                <InputLabel shrink>
                                    Combat spell
                                </InputLabel>
                                <Select
                                    css={'width: 100%'}
                                    value={unit.combatSpell}
                                    onChange={this.OnCombatSpellSet}
                                >
                                    {combatSpells.map((item) => (
                                        <MenuItem value={item.abbr}>{`${item.name} [${item.abbr}]`}</MenuItem>
                                    ))}
                                </Select>
                            </Grid>
                        </Grid>
                    }
                </div>
                <FormControlLabel onChange={this.OnChangeBehind} control={<Switch checked={unit.behind} />} label="Behind" />
                <div>
                    <Grid container spacing={1}>
                        <Grid item xs={4}>
                            <TextField
                                css={'width: 100%'}
                                name="name"
                                placeholder="Unit"
                                label="Unit name"
                                value={unit.name}
                                onChange={this.OnUnitsNameChange}
                            />
                        </Grid>
                    </Grid>

                </div>
                <ButtonGroup>
                    {unit.id && <>
                        <Button
                            css={`margin-right: ${theme.spacing(1)}px `}
                            variant="contained"
                            color="primary"
                            startIcon={<SaveIcon/>}
                            size="small"
                            onClick={this.OnSave}
                        >
                           Save
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<CancelIcon/>}
                            size="small"
                            onClick={this.props.resetForm}
                        >
                            Cancel
                        </Button>
                    </>}

                    {!unit.id && <>
                        <Button
                            css={`margin-right: ${theme.spacing(1)}px `}
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon/>}
                            size="small"
                            onClick={this.OnAddToAttackers}
                        >
                            Add to Attackers
                        </Button>
                        <Button
                            css={`margin-right: ${theme.spacing(1)}px `}
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon/>}
                            size="small"
                            onClick={this.OnAddToDefenders}
                        >
                            Add to Defenders
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<DeleteIcon/>}
                            size="small"
                            onClick={this.props.resetForm}
                        >
                            Reset
                        </Button>
                    </>}
                </ButtonGroup>
            </StyledPaper>
        );
    }
}

export const MainForm = connect<StateProps, DispatchProps>(mapStateToProps, mapDispatchToProps)(MainFormClass);
