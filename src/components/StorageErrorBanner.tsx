'use client';

import React, { useEffect, useState } from "react";
import { isStorageHealthy } from "@/lib/supabase/client";
import { testStorageAvailability, clearSupabaseStorage } from "@/utils/storageErrorHandler";
import { Glass } from "@/components/Glass/Glass";
import { Button } from "@/components/ui/button";
import { FaExclamationCircle } from 'react-icons/fa';

/**
 * StorageErrorBanner - Shows a persistent warning when browser storage is unavailable
 * Automatically appears when IndexedDB or localStorage issues are detected
 * Features beautiful glassmorphism design with smooth animations
 */
export const StorageErrorBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(!isStorageHealthy);
  const [isClearing, setIsClearing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for storage errors that occur during runtime
    const handleStorageError = (event: ErrorEvent) => {
      const error = event.error?.message || event.message || "";
      if (
        error.includes("leveldb") ||
        error.includes(".ldb") ||
        error.includes("Unable to create writable file") ||
        error.includes("quota")
      ) {
        setShowBanner(true);
      }
    };

    window.addEventListener("error", handleStorageError);
    return () => window.removeEventListener("error", handleStorageError);
  }, []);

  // Slide-in animation effect
  useEffect(() => {
    if (showBanner) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showBanner]);

  const handleClearStorage = async () => {
    setIsClearing(true);
    try {
      const success = await clearSupabaseStorage();
      if (success) {
        // Test storage again
        const test = await testStorageAvailability();
        if (test.localStorage && test.indexedDB) {
          alert("Storage cleared! Please refresh the page.");
          window.location.reload();
        } else {
          alert("Storage cleared, but issues persist. Please clear your browser cache manually.");
        }
      }
    } catch (error) {
      console.error("Failed to clear storage:", error);
      alert("Failed to clear storage. Please clear your browser cache manually.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* CSS Keyframes for pulse animation */}
      <style>
        {`
          @keyframes warningPulse {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(255, 140, 66, 0.4);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(255, 140, 66, 0);
            }
          }
        `}
      </style>

      <div
        className={`fixed top-0 left-0 right-0 z-[9999] px-2 md:px-4 py-2 transition-all duration-[400ms] ${
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        } ${isVisible ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <Glass variant="accentOrange" className="rounded-2xl overflow-hidden">
          <div className="relative px-4 md:px-6 py-4">
            {/* Decorative gradient overlay */}
            <div
              className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255, 168, 102, 0.1), rgba(255, 140, 66, 0.05))",
              }}
            />

            {/* Content */}
            <div className="relative z-[1]">
              <div className="flex flex-wrap lg:flex-nowrap items-start gap-3 md:gap-4">
                {/* Icon and Text Section */}
                <div className="flex items-start gap-3 flex-1 min-w-full lg:min-w-0">
                  {/* Warning Icon */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-[rgba(255,140,66,0.2)] flex items-center justify-center border-2 border-[rgba(255,168,102,0.4)]"
                    style={{
                      animation: "warningPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    }}
                  >
                    <FaExclamationCircle className="w-5 h-5 text-orange-600" />
                  </div>

                  {/* Text Content */}
                  <div className="flex flex-col gap-1 flex-1">
                    <h3 className="font-bold text-base md:text-lg text-orange-800 tracking-tight leading-tight">
                      Storage Limited Mode
                    </h3>
                    <p className="text-xs md:text-sm text-orange-700 leading-relaxed opacity-95">
                      Your session will not persist across page refreshes. To fix this, try clearing
                      your browser cache or use the button below to clear app storage.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0 self-stretch lg:self-center justify-end w-full lg:w-auto">
                  <Button
                    size="sm"
                    disabled={isClearing}
                    onClick={handleClearStorage}
                    className="rounded-xl font-semibold px-4 md:px-6 bg-orange-500 text-white hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(255,140,66,0.3)] active:translate-y-0 active:bg-orange-700 transition-all duration-300 shadow-[0_4px_12px_rgba(255,140,66,0.2)]"
                  >
                    {isClearing ? "Clearing..." : "Clear Storage"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="rounded-xl font-semibold text-orange-700 hover:bg-[rgba(255,140,66,0.15)] hover:-translate-y-px active:bg-[rgba(255,140,66,0.25)] active:translate-y-0 transition-all duration-300"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Glass>
      </div>
    </>
  );
};
