// (!) Approximate behavior

import {useCallback, useLayoutEffect, useRef} from "react";

export function useEvent(handler: any) {
    const handlerRef = useRef(null);

    // In a real implementation, this would run before layout effects
    useLayoutEffect(() => {
        handlerRef.current = handler;
    });

    return useCallback((...args: any) => {
        // In a real implementation, this would throw if called during render
        const fn = handlerRef.current;
        // @ts-ignore
        return fn(...args);
    }, []);
}