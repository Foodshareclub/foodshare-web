'use client';

import { useReducer, useCallback, useEffect } from 'react';
import { historyReducer } from '../utils';

interface HistoryState {
  title: string;
  description: string;
}

interface UseUndoRedoOptions {
  title: string;
  description: string;
  onUndo: (state: HistoryState) => void;
  onRedo: (state: HistoryState) => void;
  isOpen: boolean;
}

interface UseUndoRedoReturn {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  clearHistory: () => void;
  ariaMessage: string;
}

export function useUndoRedo(options: UseUndoRedoOptions): UseUndoRedoReturn {
  const { title, description, onUndo, onRedo, isOpen } = options;

  const [history, dispatchHistory] = useReducer(historyReducer, {
    past: [],
    present: { title: '', description: '' },
    future: [],
  });

  const [ariaMessage, setAriaMessage] = useReducer(
    (_: string, action: string) => action,
    ''
  );

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Save to history (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (title || description) {
        dispatchHistory({ type: 'SET', payload: { title, description } });
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [title, description]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      dispatchHistory({ type: 'UNDO' });
      const prev = history.past[history.past.length - 1];
      if (prev) {
        onUndo(prev);
        setAriaMessage('Undone');
      }
    }
  }, [canUndo, history.past, onUndo]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      dispatchHistory({ type: 'REDO' });
      const next = history.future[0];
      if (next) {
        onRedo(next);
        setAriaMessage('Redone');
      }
    }
  }, [canRedo, history.future, onRedo]);

  const clearHistory = useCallback(() => {
    dispatchHistory({ type: 'CLEAR' });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo, handleRedo]);

  return {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    clearHistory,
    ariaMessage,
  };
}
