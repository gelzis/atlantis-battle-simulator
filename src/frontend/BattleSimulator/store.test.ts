import {createAppStore} from './store';
import {saveUnit} from './actions/formActions';
import {resetState} from './actions/simulatorActions';

it('keeps independent stores and preserves unit editing and reset behavior', () => {
    const first = createAppStore();
    const second = createAppStore();
    const previousState = first.getState();

    first.dispatch(saveUnit('attackers'));

    expect(Object.keys(first.getState().attackers)).toHaveLength(1);
    expect(first.getState().attackerStats.total).toBe(1);
    expect(Object.keys(previousState.attackers)).toHaveLength(0);
    expect(Object.keys(second.getState().attackers)).toHaveLength(0);

    first.dispatch(resetState());
    expect(Object.keys(first.getState().attackers)).toHaveLength(0);
});
