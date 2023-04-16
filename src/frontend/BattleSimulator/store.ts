import {reducer} from './reducer';
import {createStore} from 'redux';
import {TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';

export const store = createStore(reducer);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

type DispatchFunc = () => AppDispatch;
export const useAppDispatch: DispatchFunc = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
