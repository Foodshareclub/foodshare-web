"use client";

import { useState, useCallback } from "react";

/**
 * useModalState - A simple hook to manage modal open/close state
 *
 * @param initialOpen - Initial open state (default: false)
 * @returns Object with isOpen state and control functions
 *
 * @example
 * ```tsx
 * const modal = useModalState();
 *
 * return (
 *   <>
 *     <button onClick={modal.open}>Open Modal</button>
 *     <Dialog open={modal.isOpen} onOpenChange={modal.setIsOpen}>
 *       <DialogContent>
 *         <button onClick={modal.close}>Close</button>
 *       </DialogContent>
 *     </Dialog>
 *   </>
 * );
 * ```
 */
export function useModalState(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  };
}

export type ModalState = ReturnType<typeof useModalState>;
