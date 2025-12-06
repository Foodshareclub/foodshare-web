'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'maintenance';
  database: boolean;
  message?: string;
  retryAfter?: number;
}

const INITIAL_POLL_INTERVAL = 15000;
const MAX_POLL_INTERVAL = 60000;

export function MaintenanceBanner(): React.ReactElement | null {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [pollInterval, setPollInterval] = useState(INITIAL_POLL_INTERVAL);

  const checkHealth = async (): Promise<void> => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('/api/health', {
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({
          status: 'maintenance',
          database: false,
          message: data.message,
          retryAfter: data.retryAfter || 30,
        });
        setPollInterval(Math.min(pollInterval * 1.5, MAX_POLL_INTERVAL));
        return;
      }

      const data: HealthStatus = await res.json();
      setStatus(data);

      if (data.status === 'healthy') {
        setDismissed(false);
        setPollInterval(INITIAL_POLL_INTERVAL);
      } else {
        const nextInterval = data.retryAfter
          ? data.retryAfter * 1000
          : Math.min(pollInterval * 1.5, MAX_POLL_INTERVAL);
        setPollInterval(nextInterval);
      }
    } catch {
      setStatus({
        status: 'maintenance',
        database: false,
        retryAfter: 30,
      });
      setPollInterval(Math.min(pollInterval * 1.5, MAX_POLL_INTERVAL));
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const poll = async (): Promise<void> => {
      if (!mounted) return;
      await checkHealth();
      if (mounted) {
        timeoutId = setTimeout(poll, pollInterval);
      }
    };

    poll();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [pollInterval]);

  if (!status || status.status === 'healthy' || dismissed) {
    return null;
  }

  const isMaintenance = status.status === 'maintenance';

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400',
        'shadow-lg'
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <span className="text-2xl">🔧</span>
          </div>

          {/* Message */}
          <div className="flex-1 text-center">
            <p className="text-white font-medium text-sm sm:text-base drop-shadow-sm">
              {isMaintenance ? (
                <>
                  <span className="hidden sm:inline">
                    We&apos;re sprucing things up! 
                  </span>
                  <span className="sm:hidden">Maintenance in progress </span>
                  <span className="opacity-90">
                    Back shortly — thanks for your patience! 💚
                  </span>
                </>
              ) : (
                <>
                  Things might be a bit slow right now. 
                  <span className="opacity-90"> We&apos;re on it! 🚀</span>
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Refresh button */}
            <button
              onClick={checkHealth}
              disabled={isChecking}
              className={cn(
                'p-2 rounded-full transition-all duration-200',
                'hover:bg-white/20 active:scale-95',
                'text-white/90 hover:text-white'
              )}
              aria-label="Check status"
            >
              <svg
                className={cn('w-4 h-4', isChecking && 'animate-spin')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Dismiss button */}
            <button
              onClick={() => setDismissed(true)}
              className={cn(
                'p-2 rounded-full transition-all duration-200',
                'hover:bg-white/20 active:scale-95',
                'text-white/90 hover:text-white'
              )}
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        {isMaintenance && (
          <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
