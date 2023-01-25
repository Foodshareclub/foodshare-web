// Use throughout your app instead of plain `useDispatch` and `useSelector`
import store, {StateAppType} from "../store/redux-store";
import {TypedUseSelectorHook, useDispatch, useSelector} from "react-redux";
import {ActionCreator, ActionCreatorsMapObject, AsyncThunk, bindActionCreators} from "@reduxjs/toolkit";
import {useMemo} from "react";

type AppDispatch = typeof store.dispatch;

type BoundActions<Actions extends ActionCreatorsMapObject> = {
    [key in keyof Actions]: Actions[key] extends AsyncThunk<any, any, any>
        ? BoundAsyncThunk<Actions[key]>
        : Actions[key]
};

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<StateAppType> = useSelector;

type BoundAsyncThunk<Action extends ActionCreator<any>> = (
    ...args: Parameters<Action>
) => ReturnType<ReturnType<Action>>;

export const useActionCreators = <Actions extends ActionCreatorsMapObject = ActionCreatorsMapObject>(actions: Actions): BoundActions<Actions> => {
    const dispatch = useAppDispatch();

    return useMemo(() => bindActionCreators(actions, dispatch), []);
};
