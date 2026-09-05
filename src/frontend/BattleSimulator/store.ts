import {reducer} from './reducer';
import {configureStore} from '@reduxjs/toolkit';
import {UnknownAction} from 'redux';
import {ActionTypes, AppState} from './types';
import {isDraft, restoreDraft} from './persistence';
import {TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';

export const createAppStore = () => configureStore({
    reducer: (state: AppState | undefined, action: UnknownAction) => {
        if (action.type === 'session/restoreDraft' && isDraft(action.payload)) return restoreDraft(action.payload);
        return reducer(state, action as ActionTypes);
    },
});
export const store = createAppStore();
export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

type DispatchFunc = () => AppDispatch;
export const useAppDispatch: DispatchFunc = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
