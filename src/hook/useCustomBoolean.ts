import {useCallback, useState} from "react";

export function useCustomBoolean() {
    const [state, setState] = useState( false)
    const setProductType = useCallback(() => {
        setState((value)=>!value)
    },[]);
    return [state, setProductType] as const
}