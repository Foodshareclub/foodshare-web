'use client';

/**
 * Feedback Modal Component
 * Allows users to submit feedback, bug reports, and feature requests
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassDialogContent } from "@/components/Glass";
import { feedbackAPI, type FeedbackType } from "@/api/feedbackAPI";
import { supabase } from "@/lib/supabase/client";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FeedbackModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Pre-fill user info if authenticated
  useEffect(() => {
    const loadUserInfo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        // Try to get user's name from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile?.full_name) {
          setName(profile.full_name);
        }
      }
    };
    if (isOpen) {
      loadUserInfo();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate inputs
      if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
        throw new Error("Please fill in all fields");
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      // Get current user ID if authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Submit feedback
      const { error: submitError } = await feedbackAPI.submitFeedback({
        profile_id: user?.id,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        feedback_type: feedbackType,
      });

      if (submitError) throw submitError;

      // Show success message
      setSuccess(true);

      // Reset form after 2 seconds and close
      closeTimeoutRef.current = setTimeout(() => {
        resetForm();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setFeedbackType("general");
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
      <GlassDialogContent className="max-w-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key="feedback-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col gap-6 items-stretch">
              {/* Header */}
              <div className="text-center">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-semibold text-gray-900">
                    "Send us your feedback"
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 mt-2">
                    
                      We'd love to hear from you! Share your thoughts, report bugs, or suggest new
                      features.
                    
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Success Message */}
              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-green-800">
                        "Thank you for your feedback!"
                      </h3>
                      <p className="mt-1 text-sm text-green-700">
                        "We'll review your message and get back to you soon."
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-red-800">
                        "Error"
                      </h3>
                      <p className="mt-1 text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              {!success && (
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-4 items-stretch">
                    {/* Feedback Type */}
                    <div>
                      <label className="text-sm font-medium mb-2 block text-gray-700">
                        "Type of feedback"
                      </label>
                      <select
                        value={feedbackType}
                        onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="general">General Feedback</option>
                        <option value="bug">Bug Report</option>
                        <option value="feature">Feature Request</option>
                        <option value="complaint">Complaint</option>
                      </select>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="text-sm font-medium mb-2 block text-gray-700">
                        "Your name"
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={"John Doe"}
                        className="rounded-xl"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-sm font-medium mb-2 block text-gray-700">
                        "Email address"
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={"your@email.com"}
                        className="rounded-xl"
                        required
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="text-sm font-medium mb-2 block text-gray-700">
                        "Subject"
                      </label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={"Brief description of your feedback"}
                        className="rounded-xl"
                        required
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="text-sm font-medium mb-2 block text-gray-700">
                        "Message"
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={"Tell us more about your feedback..."}
                        className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3 mt-2">
                      <Button
                        type="button"
                        onClick={handleClose}
                        variant="outline"
                        className="flex-1 rounded-xl"
                        disabled={isLoading}
                      >
                        "Cancel"
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending..." : "Send Feedback"}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </GlassDialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
