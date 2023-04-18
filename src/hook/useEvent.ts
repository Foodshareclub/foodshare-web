import {useCallback, useEffect, useLayoutEffect, useRef} from "react";

export function useEvent<T extends (...args: any[]) => any>(fn: T) {
    const handlerRef = useRef(fn);
    useLayoutEffect(() => {
        handlerRef.current = fn;
    }, [fn]);

    return useCallback((...args: Parameters<T>) => {
        return handlerRef.current.apply(null, args);
    }, [handlerRef]);
}

type GetWindowEvent<Type extends string> = Type extends keyof WindowEventMap ? WindowEventMap[Type] : Event;

export function useWindowEvent<Type extends string>(type: Type, cb: (event: GetWindowEvent<Type>) => void): void

export function useWindowEvent(type: string, cb: (event: Event) => void) {
    const eventCb = useEvent(cb);
    useEffect(() => {
        window.addEventListener(type, eventCb);
        return () => window.removeEventListener(type, eventCb);
    }, [eventCb, type])
}
