'use client';

import { useEffect, useRef } from 'react';
import { pretty } from '@/lib/logger';
import type { LogContext } from '@/lib/logger';

/**
 * Hook for component-scoped logging with lifecycle tracking
 */
export function useLogger(component: string) {
  const mountTime = useRef<number>(0);

  useEffect(() => {
    mountTime.current = performance.now();
    pretty.render(component, 'mount');

    return () => {
      const duration = performance.now() - mountTime.current;
      pretty.render(component, 'unmount', { lifetimeMs: Math.round(duration) });
    };
  }, [component]);

  return {
    debug: (message: string, data?: unknown) => 
      pretty.debug(message, { component }, data),
    
    info: (message: string, data?: unknown) => 
      pretty.info(message, { component }, data),
    
    warn: (message: string, data?: unknown) => 
      pretty.warn(message, { component }, data),
    
    error: (message: string, error?: Error, context?: LogContext) => 
      pretty.error(message, error, { ...context, component }),
    
    success: (message: string, data?: unknown) => 
      pretty.success(message, { component }, data),
    
    update: (props?: Record<string, unknown>) => 
      pretty.render(component, 'update', props),
  };
}

export default useLogger;
