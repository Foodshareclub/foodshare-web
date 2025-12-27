import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * A hook that returns a stable callback reference that always calls the latest version of the function.
 * Useful for event handlers that need to access latest state without causing re-renders.
 */
export function useEvent<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const handlerRef = useRef(fn);
  useLayoutEffect(() => {
    handlerRef.current = fn;
  }, [fn]);

  return useCallback((...args: TArgs): TReturn => {
    return handlerRef.current(...args);
  }, []);
}

type GetWindowEvent<Type extends string> = Type extends keyof WindowEventMap
  ? WindowEventMap[Type]
  : Event;

export function useWindowEvent<Type extends string>(
  type: Type,
  cb: (event: GetWindowEvent<Type>) => void
): void;

export function useWindowEvent(type: string, cb: (event: Event) => void) {
  const eventCb = useEvent(cb);
  useEffect(() => {
    window.addEventListener(type, eventCb);
    return () => window.removeEventListener(type, eventCb);
  }, [eventCb, type]);
}
