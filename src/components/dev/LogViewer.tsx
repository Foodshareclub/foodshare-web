'use client';

import { useState, useEffect, useRef } from 'react';
import { getErrorHistory, clearErrorHistory, type ErrorLog, network, type NetworkEntry } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface LogViewerProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const LEVEL_CONFIG = {
  debug: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', emoji: '🔍', label: 'DEBUG' },
  info: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', emoji: 'ℹ️', label: 'INFO' },
  warn: { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', emoji: '⚠️', label: 'WARN' },
  error: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', emoji: '❌', label: 'ERROR' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', emoji: '✅', label: 'OK' },
};

const POSITION_CLASSES = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
};

/**
 * Beautiful dev-only log viewer panel
 * Shows error history with filtering, search, and export
 */
export function LogViewer({ className, position = 'bottom-right' }: LogViewerProps) {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const history = getErrorHistory();
      setLogs(history);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (listRef.current && !isMinimized) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs.length, isMinimized]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = !search || 
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.context?.component?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  const handleClear = () => {
    clearErrorHistory();
    setLogs([]);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foodshare-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLog = (log: ErrorLog) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
  };

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const positionClass = POSITION_CLASSES[position];

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed z-[9999] p-3 rounded-full shadow-lg transition-all duration-200',
          'bg-gradient-to-br from-gray-900 to-gray-800 text-white',
          'hover:scale-105 hover:shadow-xl',
          'dark:from-gray-100 dark:to-gray-200 dark:text-gray-900',
          errorCount > 0 && 'from-red-600 to-red-700 animate-pulse',
          isOpen && 'opacity-0 pointer-events-none',
          positionClass,
          className
        )}
        title={`Toggle Log Viewer (${logs.length} logs)`}
      >
        <span className="text-xl">🍽️</span>
        {logs.length > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1',
            errorCount > 0 ? 'bg-red-500' : warnCount > 0 ? 'bg-amber-500' : 'bg-blue-500'
          )}>
            {logs.length > 99 ? '99+' : logs.length}
          </span>
        )}
      </button>

      {/* Log Panel */}
      {isOpen && (
        <div 
          className={cn(
            'fixed z-[9999] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200',
            isMinimized ? 'w-80 h-12' : 'w-[420px] max-h-[70vh]',
            isPinned ? 'opacity-100' : 'opacity-95 hover:opacity-100',
            positionClass
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
            <div className="flex items-center gap-2">
              <span className="text-lg">🍽️</span>
              <span className="font-semibold text-sm bg-gradient-to-r from-[#FF2D55] to-[#FC642D] bg-clip-text text-transparent">
                FoodShare Logs
              </span>
              {logs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {filteredLogs.length}/{logs.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={cn(
                  'p-1.5 rounded-md transition-colors text-sm',
                  isPinned ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                📌
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? '🔼' : '🔽'}
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                title="Export logs"
              >
                📥
              </button>
              <button
                onClick={handleClear}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                title="Clear logs"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 transition-colors text-sm"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Search & Filters */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF2D55]/50"
                />
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {['all', 'error', 'warn', 'info', 'success', 'debug'].map((level) => {
                    const config = level === 'all' ? null : LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG];
                    const count = level === 'all' ? logs.length : logs.filter(l => l.level === level).length;
                    
                    return (
                      <button
                        key={level}
                        onClick={() => setFilter(level)}
                        className={cn(
                          'px-2 py-1 text-xs rounded-md transition-all flex items-center gap-1 whitespace-nowrap',
                          filter === level
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                        )}
                      >
                        {config ? config.emoji : '📋'}
                        <span>{level === 'all' ? 'All' : config?.label}</span>
                        {count > 0 && (
                          <span className="text-[10px] opacity-60">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Log List */}
              <div ref={listRef} className="overflow-y-auto max-h-[calc(70vh-140px)]">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-2">🍽️</div>
                    <p className="text-gray-500 text-sm">No logs yet</p>
                    <p className="text-gray-400 text-xs mt-1">Logs will appear here as they occur</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredLogs.map((log, i) => (
                      <LogEntry 
                        key={`${log.timestamp}-${i}`} 
                        log={log} 
                        onCopy={() => handleCopyLog(log)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Stats */}
              {logs.length > 0 && (
                <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between text-[10px] text-gray-500">
                  <div className="flex items-center gap-3">
                    {errorCount > 0 && <span className="text-red-500">❌ {errorCount}</span>}
                    {warnCount > 0 && <span className="text-amber-500">⚠️ {warnCount}</span>}
                  </div>
                  <span>Last: {new Date(logs[logs.length - 1]?.timestamp).toLocaleTimeString()}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function LogEntry({ log, onCopy }: { log: ErrorLog; onCopy: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = LEVEL_CONFIG[log.level];
  const time = new Date(log.timestamp).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });

  return (
    <div
      className={cn(
        'text-xs cursor-pointer transition-colors',
        config.bg,
        config.text,
        'hover:brightness-95 dark:hover:brightness-110'
      )}
    >
      <div 
        className="flex items-start gap-2 p-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm">{config.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-[10px] font-mono opacity-60">{time}</code>
            {log.context?.component && (
              <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-[10px] font-medium">
                {log.context.component}
              </span>
            )}
          </div>
          <p className="font-medium mt-0.5 break-words">{log.message}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy"
          >
            📋
          </button>
          <span className="opacity-40 text-[10px]">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-2 pb-2 pl-8 space-y-2">
          {log.context && Object.keys(log.context).filter(k => k !== 'component').length > 0 && (
            <div>
              <span className="font-semibold text-[10px] uppercase tracking-wide opacity-60">Context</span>
              <pre className="mt-1 p-2 bg-black/5 dark:bg-white/5 rounded text-[10px] overflow-x-auto font-mono">
                {JSON.stringify(
                  Object.fromEntries(Object.entries(log.context).filter(([k]) => k !== 'component')), 
                  null, 
                  2
                )}
              </pre>
            </div>
          )}
          {log.stack && (
            <div>
              <span className="font-semibold text-[10px] uppercase tracking-wide opacity-60">Stack Trace</span>
              <pre className="mt-1 p-2 bg-black/5 dark:bg-white/5 rounded text-[10px] overflow-x-auto whitespace-pre-wrap font-mono max-h-40">
                {log.stack}
              </pre>
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] opacity-60">
            <span>🌐 {log.url || 'N/A'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogViewer;
