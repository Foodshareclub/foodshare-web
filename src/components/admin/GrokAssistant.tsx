'use client';

import React, { useState, useRef, useEffect } from "react";
import { FaPaperPlane, FaUsers, FaEnvelope } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { getGrokInsights, getSuggestedQuestions } from "@/api/admin/grokInsights";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load suggested questions
    getSuggestedQuestions().then(setSuggestedQuestions).catch(console.error);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const insight = await getGrokInsights(messageText);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: insight,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
      return <HiSparkles className="w-5 h-5 text-purple-600" />;
    }
    return <FaUsers className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="flex items-center gap-3">
          <HiSparkles className="w-6 h-6 text-white" />
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
            {message.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                {getMessageIcon(message.role)}
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
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
              <AiOutlineLoading3Quarters className="w-5 h-5 text-purple-600 animate-spin" />
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
              <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
            ) : (
              <FaPaperPlane className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Using cost-optimized models • Press Enter to send
        </p>
      </div>
    </div>
  );
};
