import React, {PureComponent} from 'react';
import {bindActionCreators, Dispatch} from 'redux';
import styled from 'styled-components';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {TextField} from '@material-ui/core';
import {connect} from 'react-redux';

import {AppState} from '../types';
import {setBattleCount} from '../actions/settingsModalAtions';

const SettingsModalDialogContent = styled(DialogContent)`
    min-width: 400px;
`;

type StateProps = {
    battleCount: number
}

const mapStateToProps = (state: AppState): StateProps => ({
    battleCount: state.battleCount,
});

type SettingsModalProps = {
    onClose: () => void
};

type DispatchProps = {
    setBattleCount: typeof setBattleCount
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => {
    return bindActionCreators({
        setBattleCount,
    }, dispatch);
};

type ClassState = {
    battleCount: string
}

type Props = SettingsModalProps & DispatchProps & StateProps;

class SettingsModalClass extends PureComponent<Props, ClassState> {
    constructor(props: Props) {
        super(props);

        this.state = {
            battleCount: String(this.props.battleCount),
        };
    }

    _onSave(): void {
        this.props.setBattleCount(parseInt(this.state.battleCount) || 50);
        this.props.onClose();
    }

    render() {
        const {onClose} = this.props;

        return (
            <Dialog open={true} onClose={onClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Settings</DialogTitle>
                <SettingsModalDialogContent>
                    <TextField
                        css={'width: 100%'}
                        name="name"
                        placeholder="Unit"
                        label="Amount of battles to run (max 100)"
                        value={this.state.battleCount}
                        onChange={(event): void => this.setState({battleCount: event.target.value})}
                    />
                </SettingsModalDialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="primary">
                        Cancel
                    </Button>
                    <Button
                        onClick={this._onSave.bind(this)}
                        color="primary"
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export const SettingsModal = connect(mapStateToProps, mapDispatchToProps)(SettingsModalClass);
