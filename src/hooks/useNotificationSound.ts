"use client";

/**
 * useNotificationSound Hook
 * Plays a sound when new notifications arrive
 * Falls back to Web Audio API beep if sound file is unavailable
 */

import { useEffect, useRef, useCallback } from "react";

const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3";

export function useNotificationSound(enabled: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Try to preload the audio file
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.5;

    // Check if audio loads successfully
    audio.addEventListener("canplaythrough", () => {
      soundLoadedRef.current = true;
      audioRef.current = audio;
    });

    audio.addEventListener("error", () => {
      soundLoadedRef.current = false;
      // Will fall back to Web Audio API beep
    });

    // Attempt to load
    audio.load();

    return () => {
      audioRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Fallback beep using Web Audio API
  const playBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800; // Hz
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // Web Audio API not supported or blocked
    }
  }, []);

  const playSound = useCallback(() => {
    if (!enabled) return;

    // Try to play the audio file first
    if (soundLoadedRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // If audio play fails, try beep
        playBeep();
      });
    } else {
      // Fall back to beep
      playBeep();
    }
  }, [enabled, playBeep]);

  return { playSound };
}
