"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Users, Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  getGrokInsight,
  getInsightSuggestions,
  resetAiService,
} from "@/app/actions/admin-insights";

interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
  errorType?: "rate_limit" | "circuit_open" | "timeout" | "api_error" | "unknown";
  retryAfterSeconds?: number;
  originalQuery?: string;
}

export const GrokAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your FoodShare AI assistant. I can help you analyze user behavior, optimize campaigns, predict churn, and provide actionable insights about your platform. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load suggested questions via server action
    getInsightSuggestions().then(setSuggestedQuestions).catch(console.error);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }
    };
  }, []);

  const startRetryCountdown = useCallback((seconds: number) => {
    setRetryCountdown(seconds);
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
    }
    retryTimerRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (retryTimerRef.current) {
            clearInterval(retryTimerRef.current);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleRetry = useCallback(
    async (originalQuery: string) => {
      if (isLoading || retryCountdown !== null) return;

      await handleSendMessage(originalQuery);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, retryCountdown]
  );

  const handleResetService = useCallback(async () => {
    if (isResetting) return;
    setIsResetting(true);

    try {
      const result = await resetAiService();
      const resetMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: result.success ? "✓ " + result.message : "✗ " + result.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, resetMessage]);
      setRetryCountdown(null);
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }
    } catch {
      // Silent fail
    } finally {
      setIsResetting(false);
    }
  }, [isResetting]);

  const handleSendMessage = async (query?: string) => {
    const messageText = query || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await getGrokInsight(messageText);

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.insight!,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Handle error with retry info
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "error",
          content: result.error || "Failed to get insights",
          timestamp: new Date(),
          errorType: result.errorType,
          retryAfterSeconds: result.retryAfterSeconds,
          originalQuery: messageText,
        };
        setMessages((prev) => [...prev, errorMessage]);

        // Start countdown if retry is suggested
        if (result.retryAfterSeconds) {
          startRetryCountdown(result.retryAfterSeconds);
        }
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "error",
        content: "Sorry, I encountered an unexpected error. Please try again.",
        timestamp: new Date(),
        errorType: "unknown",
        retryAfterSeconds: 5,
        originalQuery: messageText,
      };
      setMessages((prev) => [...prev, errorMessage]);
      startRetryCountdown(5);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (role: string) => {
    if (role === "assistant") {
      return <Sparkles className="w-5 h-5 text-purple-600" />;
    }
    return <Users className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-white" />
          <div>
            <h2 className="text-xl font-bold text-white">Grok AI Assistant</h2>
            <p className="text-sm text-purple-100">
              Powered by xAI - Ask me anything about your platform
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {(message.role === "assistant" || message.role === "error") && (
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === "error" ? "bg-red-100" : "bg-purple-100"
                }`}
              >
                {message.role === "error" ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : (
                  getMessageIcon(message.role)
                )}
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : message.role === "error"
                    ? "bg-red-50 text-red-900 border border-red-200"
                    : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>

              {/* Error actions */}
              {message.role === "error" && message.originalQuery && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRetry(message.originalQuery!)}
                    disabled={isLoading || retryCountdown !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${retryCountdown !== null ? "animate-spin" : ""}`}
                    />
                    {retryCountdown !== null ? `Retry in ${retryCountdown}s` : "Retry"}
                  </button>

                  {message.errorType === "circuit_open" && (
                    <button
                      onClick={handleResetService}
                      disabled={isResetting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isResetting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Reset Service
                    </button>
                  )}
                </div>
              )}

              <span className="text-xs opacity-70 mt-2 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            {message.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                {getMessageIcon(message.role)}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-gray-600">Analyzing your data...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && messages.length <= 2 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(question)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-full hover:bg-purple-50 hover:border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about users, listings, campaigns, trends..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Try &quot;how many users signed up this week&quot; or &quot;top 10 most active
          users&quot; for deep database analysis
        </p>
      </div>
    </div>
  );
};
