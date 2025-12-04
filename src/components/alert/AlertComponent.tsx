'use client';

import React, { useEffect, useState, useCallback } from "react";
import { Glass } from "@/components/Glass";
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export type StatusType = "info" | "warning" | "success" | "error" | "loading" | undefined;

type PropsType = {
  status: StatusType;
  title: string;
  top: string;
  onDismiss?: () => void;
};

/**
 * AlertComponent
 * Self-dismissing alert that shows success or error messages
 * Uses callback prop instead of Redux for dismissal
 */
const AlertComponent: React.FC<PropsType> = ({ status, title, top, onDismiss }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsLoaded(true);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    const time = setTimeout(() => {
      handleDismiss();
    }, 3000);

    return () => clearTimeout(time);
  }, [status, handleDismiss]);

  if (status === "success") {
    return (
      <>
        {isLoaded && (
          <div className="fixed left-0 z-10 w-full" style={{ top }}>
            <Glass variant="accentGreen" className="p-4">
              <div className="flex items-center gap-3 bg-transparent">
                <FaCheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">{title}</span>
              </div>
            </Glass>
          </div>
        )}
      </>
    );
  }
  if (status === "error") {
    return (
      <>
        {isLoaded && (
          <div className="fixed left-0 z-10 w-full" style={{ top }}>
            <Glass variant="accentOrange" className="p-4">
              <div className="flex items-center gap-3 bg-transparent">
                <FaExclamationCircle className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">{title}</span>
              </div>
            </Glass>
          </div>
        )}
      </>
    );
  }
  return <></>;
};

export default AlertComponent;
