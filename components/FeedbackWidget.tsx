'use client';

import React, { useState, useContext } from 'react';
import { ChatBubbleIcon, BugIcon, LightbulbIcon, StarIcon, XIcon, SpinnerIcon, CheckIcon } from './icons';
import { AuthContext } from './contexts/AuthContext';

type FeedbackType = 'bug' | 'feature' | 'general' | 'satisfaction';

interface FeedbackWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
}

export function FeedbackWidget({ position = 'bottom-right' }: FeedbackWidgetProps) {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const positionClasses = position === 'bottom-right'
    ? 'right-4 sm:right-6'
    : 'left-4 sm:left-6';

  const feedbackTypes = [
    { type: 'bug' as FeedbackType, label: 'Bug', icon: BugIcon, color: 'text-red-500 bg-red-50 border-red-200' },
    { type: 'feature' as FeedbackType, label: 'Feature', icon: LightbulbIcon, color: 'text-amber-500 bg-amber-50 border-amber-200' },
    { type: 'general' as FeedbackType, label: 'Feedback', icon: ChatBubbleIcon, color: 'text-teal-500 bg-teal-50 border-teal-200' },
  ];

  const handleSubmit = async () => {
    if (!message.trim() && rating === 0) {
      setError('Please provide a rating or message');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || null,
          type: feedbackType,
          rating: rating || null,
          message: message.trim() || null,
          pageUrl: typeof window !== 'undefined' ? window.location.href : null,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setIsSuccess(true);

      // Reset after showing success
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setFeedbackType('general');
        setRating(0);
        setMessage('');
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    // Don't reset form in case user wants to reopen
  };

  // Success state
  if (isSuccess) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />

        {/* Success Modal */}
        <div className={`fixed bottom-20 ${positionClasses} z-50 bg-white rounded-2xl shadow-xl p-6 w-[calc(100vw-2rem)] max-w-sm animate-slide-up`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Thank you!</h3>
            <p className="text-slate-600 text-sm">Your feedback helps us improve RealWorth.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-20 ${positionClasses} z-40 bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105`}
          aria-label="Send feedback"
        >
          <ChatBubbleIcon className="w-6 h-6" />
        </button>
      )}

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />
      )}

      {/* Feedback Modal */}
      {isOpen && (
        <div className={`fixed bottom-20 ${positionClasses} z-50 bg-white rounded-2xl shadow-xl w-[calc(100vw-2rem)] max-w-sm animate-slide-up`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Send Feedback</h3>
            <button
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Feedback Type Selector */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">Type</label>
              <div className="flex gap-2">
                {feedbackTypes.map(({ type, label, icon: Icon, color }) => (
                  <button
                    key={type}
                    onClick={() => setFeedbackType(type)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                      feedbackType === type
                        ? color
                        : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Star Rating */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                How&apos;s your experience? (optional)
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <StarIcon
                      className={`w-7 h-7 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                {feedbackType === 'bug' ? 'Describe the issue' :
                 feedbackType === 'feature' ? 'Describe your idea' :
                 'Your feedback'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  feedbackType === 'bug' ? 'What went wrong? Steps to reproduce...' :
                  feedbackType === 'feature' ? 'What would you like to see?' :
                  'Tell us what you think...'
                }
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Feedback'
              )}
            </button>

            {/* Anonymous note */}
            {!user && (
              <p className="text-xs text-slate-400 text-center">
                Submitting anonymously. Sign in to track your feedback.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;
