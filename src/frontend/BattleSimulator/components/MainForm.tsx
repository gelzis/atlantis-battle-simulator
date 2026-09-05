import React, {ChangeEvent, SyntheticEvent, PureComponent, ReactNode} from 'react';
import {SelectChangeEvent} from '@mui/material/Select';
import {bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';
import styled from 'styled-components';
import {
    Button,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Slider,
    Switch,
    TextField,
    Tooltip,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import Autocomplete from '@mui/material/Autocomplete';
import SaveIcon from '@mui/icons-material/Save';

import {StyledHeading, StyledPaper, theme} from '../../StyledComponents';
import {ItemListSorted, SkillListSorted} from '../resources';
import {
    AppState,
    Unit,
} from '../types';
import {
    addItem,
    addSkill,
    changeItemAbbr,
    changeItemAmount,
    changeSkillAbbr,
    changeSkillLevel,
    resetForm,
    saveUnit,
    setBehind,
    setCombatSpell,
    setUnitsName,
} from '../actions/formActions';

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing(1)};
`;

const FormPaper = styled(StyledPaper)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing(3)};
`;

const FormSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing(2)};
`;

const SliderContainer = styled.div`
  box-sizing: border-box;
  height: 56px;
  padding: 4px 12px 0;
`;

type JsonSkill = {
    abbr: string
    name: string
    combatSpell?: boolean
}

type JsonItem = {
    abbr: string
    name: string
    category?: 'man' | 'monster' | 'illusion' | 'weapon' | 'armour' | 'mount' | 'tool'
}

type StateProps = {
    unit: Unit
};

type DispatchProps = {
    saveUnit: typeof saveUnit
    addSkill: typeof addSkill
    addItem: typeof addItem

    changeItemAbbr: typeof changeItemAbbr
    changeItemAmount: typeof changeItemAmount

    changeSkillAbbr: typeof changeSkillAbbr
    changeSkillLevel: typeof changeSkillLevel

    setBehind: typeof setBehind
    setUnitsName: typeof setUnitsName
    setCombatSpell: typeof setCombatSpell

    resetForm: typeof resetForm
};
type FormProps = StateProps & DispatchProps;

const mapStateToProps = (state: AppState): StateProps => ({
    unit: state.unit,
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => {
    return bindActionCreators({
        addItem,
        addSkill,
        changeItemAbbr,
        changeItemAmount,
        changeSkillAbbr,
        changeSkillLevel,
        resetForm,
        saveUnit,
        setBehind,
        setCombatSpell,
        setUnitsName,
    }, dispatch);
};

class MainFormClass extends PureComponent<FormProps, null> {
    OnChangeItemAbbr = (itemId: string, event: SyntheticEvent, object: JsonItem): void => {
        this.props.changeItemAbbr(itemId, object?.abbr, object?.name);
    };

    OnChangeItemAmount = (itemId: string, event: React.ChangeEvent<HTMLInputElement>): void => {
        const amount = parseInt(event.target.value.replace(/\D+/g, ''), 10) || 0;
        this.props.changeItemAmount(itemId, amount);
    };

    OnChangeSkillAbbr = (itemId: string, event: SyntheticEvent, object: JsonSkill): void => {
        this.props.changeSkillAbbr(itemId, object?.abbr, object?.name, object?.combatSpell);
    };

    OnChangeSkillLevel = (itemId: string, event: SyntheticEvent, value: number): void => {
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

    OnCombatSpellSet = (event: SelectChangeEvent<string>): void => {
        this.props.setCombatSpell(event.target.value);
    };

    render() {
        const {unit, addItem, addSkill} = this.props;

        const combatSpells = unit.skills.filter((skill) => skill.combatSpell);

        return (
            <FormPaper square elevation={3}>
                <FormSection>
                    <StyledHeading css="margin: 0;" variant="h5">
                        Men/Items/Monsters <Tooltip title="Add new item"><AddCircleIcon onClick={addItem} css={'cursor: pointer'}/></Tooltip>
                    </StyledHeading>
                    {unit.items.map((item, key) => {
                        return (
                            <Grid key={key} container spacing={2}>
                                <Grid size={{md: 4, xs: 6}}>
                                    <InputLabel shrink>
                                        Item
                                    </InputLabel>
                                    <Autocomplete
                                        id={`item-autocomplete-${key}`}
                                        options={ItemListSorted}
                                        onChange={this.OnChangeItemAbbr.bind(this, item.id)}
                                        getOptionLabel={(option: JsonItem): string => `${option.name} [${option.abbr}]`}
                                        isOptionEqualToValue={(a, b): boolean => a.abbr === b.abbr}
                                        value={item.name ? {name: item.name, abbr: item.abbr} : null}
                                        size={'small'}
                                        renderInput={(params): ReactNode =>
                                            <TextField
                                                {...params}
                                                size="small"
                                                variant="outlined"
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid size={{md: 4, xs: 6}}>
                                    <InputLabel shrink>
                                        Amount
                                    </InputLabel>
                                    <TextField
                                        size="small"
                                        variant="outlined"
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
                </FormSection>
                <FormSection>
                    <StyledHeading css="margin: 0;" variant="h5">
                        Skills <Tooltip title="Add new skill"><AddCircleIcon onClick={addSkill} css={'cursor: pointer'}/></Tooltip>
                    </StyledHeading>
                    {unit.skills.map((item, key) => {
                        return (
                            <Grid key={key} container spacing={2}>
                                <Grid size={{md: 4, xs: 6}}>
                                    <InputLabel shrink>
                                        Skill
                                    </InputLabel>
                                    <Autocomplete
                                        id={`skill-autocomplete-${key}`}
                                        options={SkillListSorted}
                                        onChange={this.OnChangeSkillAbbr.bind(this, item.id)}
                                        getOptionLabel={(option: JsonSkill): string => `${option.name} [${option.abbr}]`}
                                        isOptionEqualToValue={(a, b): boolean => a.abbr === b.abbr}
                                        value={item.name ? {name: item.name, abbr: item.abbr} : null}
                                        size="small"
                                        renderInput={(params): ReactNode =>
                                            <TextField
                                                {...params}
                                                size="small"
                                                variant="outlined"
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid size={{md: 4, xs: 6}}>
                                    <InputLabel shrink>
                                        Level
                                    </InputLabel>
                                    <SliderContainer>
                                        <Slider
                                            step={1}
                                            onChange={this.OnChangeSkillLevel.bind(this, item.id)}
                                            value={item.level}
                                            marks={[{label: '1', value: 1}, {label: '2', value: 2}, {label: '3', value: 3}, {label: '4', value: 4}, {label: '5', value: 5}]}
                                            min={1}
                                            max={5}
                                            valueLabelDisplay="auto"
                                        />
                                    </SliderContainer>
                                </Grid>
                            </Grid>
                        );
                    })}
                </FormSection>
                {combatSpells.length > 0 &&
                        <Grid container spacing={2}>
                            <Grid size={{md: 4, xs: 6}}>
                                <InputLabel shrink>
                                    Combat spell
                                </InputLabel>
                                <Select
                                    size="small"
                                    css={'width: 100%'}
                                    value={unit.combatSpell}
                                    onChange={this.OnCombatSpellSet}
                                >
                                    {combatSpells.map((item) => (
                                        <MenuItem key={item.abbr} value={item.abbr}>{`${item.name} [${item.abbr}]`}</MenuItem>
                                    ))}
                                </Select>
                            </Grid>
                        </Grid>
                }
                <FormSection>
                    <FormControlLabel control={<Switch checked={unit.behind} onChange={this.OnChangeBehind} />} label="Behind" />
                    <Grid container spacing={2}>
                        <Grid size={{md: 4, xs: 6}}>
                            <InputLabel shrink htmlFor="unit-name">
                                Unit name
                            </InputLabel>
                            <TextField
                                id="unit-name"
                                size="small"
                                variant="outlined"
                                css={'width: 100%'}
                                name="name"
                                placeholder="Unit"
                                value={unit.name}
                                onChange={this.OnUnitsNameChange}
                            />
                        </Grid>
                    </Grid>

                </FormSection>
                <ButtonGroup>
                    {unit.id && <>
                        <Button
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
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon/>}
                            size="small"
                            onClick={this.OnAddToAttackers}
                            data-testid="add-to-attackers"
                        >
                            Add to Attackers
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon/>}
                            size="small"
                            onClick={this.OnAddToDefenders}
                            data-testid="add-to-defenders"
                        >
                            Add to Defenders
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<DeleteIcon/>}
                            size="small"
                            onClick={this.props.resetForm}
                            data-testid="reset-form"
                        >
                            Reset
                        </Button>
                    </>}
                </ButtonGroup>
            </FormPaper>
        );
    }
}

export const MainForm = connect<StateProps, DispatchProps>(mapStateToProps, mapDispatchToProps)(MainFormClass);
