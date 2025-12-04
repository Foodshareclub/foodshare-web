"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  // Using any for browser Speech Recognition API compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
     
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`
        p-2 rounded-lg transition-all duration-200
        ${
          isListening
            ? "bg-red-500 text-white animate-pulse"
            : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title={isListening ? "Stop recording" : "Start voice input"}
    >
      {isListening ? (
        <FaMicrophoneSlash className="h-4 w-4" />
      ) : (
        <FaMicrophone className="h-4 w-4" />
      )}
    </button>
  );
};
