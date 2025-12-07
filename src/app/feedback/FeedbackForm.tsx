"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { MdCheckCircle, MdError, MdSend } from "react-icons/md";
import { submitFeedback, type FeedbackType } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FeedbackFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  feedback_type: FeedbackType;
}

interface FeedbackFormProps {
  defaultName: string;
  defaultEmail: string;
}

export function FeedbackForm({ defaultName, defaultEmail }: FeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeedbackFormData>({
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      subject: "",
      message: "",
      feedback_type: "general",
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const result = await submitFeedback({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        feedback_type: data.feedback_type,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setSubmitStatus("success");
      reset({
        name: defaultName,
        email: defaultEmail,
        subject: "",
        message: "",
        feedback_type: "general",
      });
      setTimeout(() => setSubmitStatus(null), 5000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Success/Error Messages */}
      {submitStatus && (
        <div
          className={`mb-4 border-l-[3px] ${
            submitStatus === "success"
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50"
          } bg-white rounded-lg shadow-sm`}
        >
          <div className="p-3">
            <div className="flex items-center gap-2">
              {submitStatus === "success" ? (
                <MdCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <MdError className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span className="font-semibold text-sm">
                {submitStatus === "success"
                  ? "Feedback sent successfully!"
                  : "Failed to send feedback"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 md:p-5">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4">
              {/* Feedback Type */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700">
                  Type
                </label>
                <select
                  {...register("feedback_type")}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white cursor-pointer hover:border-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                >
                  <option value="general">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>

              {/* Name & Email - Two columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700">
                    Name
                  </label>
                  <Input
                    {...register("name", {
                      required: "Required",
                      minLength: { value: 2, message: "Too short" },
                    })}
                    placeholder="Your name"
                    className={`h-10 rounded-lg border ${
                      errors.name ? "border-red-400" : "border-gray-300"
                    } hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900`}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-xs mt-0.5">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700">
                    Email
                  </label>
                  <Input
                    {...register("email", {
                      required: "Required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email",
                      },
                    })}
                    type="email"
                    placeholder="your@email.com"
                    className={`h-10 rounded-lg border ${
                      errors.email ? "border-red-400" : "border-gray-300"
                    } hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900`}
                  />
                  {errors.email && (
                    <p className="text-red-600 text-xs mt-0.5">{errors.email.message}</p>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700">
                  Subject
                </label>
                <Input
                  {...register("subject", {
                    required: "Required",
                    minLength: { value: 5, message: "Too short" },
                  })}
                  placeholder="Brief description"
                  className={`h-10 rounded-lg border ${
                    errors.subject ? "border-red-400" : "border-gray-300"
                  } hover:border-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900`}
                />
                {errors.subject && (
                  <p className="text-red-600 text-xs mt-0.5">{errors.subject.message}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700">
                  Message
                </label>
                <textarea
                  {...register("message", {
                    required: "Required",
                    minLength: { value: 10, message: "Too short" },
                  })}
                  placeholder="Tell us more..."
                  rows={5}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.message ? "border-red-400" : "border-gray-300"
                  } resize-vertical text-sm hover:border-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900`}
                />
                {errors.message && (
                  <p className="text-red-600 text-xs mt-0.5">{errors.message.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-900 text-white font-semibold rounded-lg h-[42px] hover:bg-gray-800 active:bg-gray-900"
              >
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    Send feedback
                    <MdSend className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
