'use client';

import { useEffect } from 'react';
import { initLogger } from '@/lib/logger';
import { LogViewer } from './LogViewer';

interface DevToolsProps {
  /** Show the floating log viewer */
  showLogViewer?: boolean;
  /** Position of the log viewer */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** App version to display */
  version?: string;
}

/**
 * DevTools component - includes logger initialization and dev UI
 * Only renders in development mode
 */
export function DevTools({ 
  showLogViewer = true, 
  position = 'bottom-right',
  version,
}: DevToolsProps) {
  useEffect(() => {
    // Initialize logger on mount
    initLogger({
      showBanner: true,
      showEnvInfo: true,
      enableProfiler: true,
      version,
    });
  }, [version]);

  // Only render in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      {showLogViewer && <LogViewer position={position} />}
    </>
  );
}

export default DevTools;
