'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { AppraisalResult } from '@/lib/types';
import { CameraIcon } from '@/components/icons';

interface ChatInterfaceProps {
  userId: string;
  appraisalId?: string;
  appraisalContext?: AppraisalResult;
  onClose?: () => void;
  onAddToCollection?: () => void;
}

export default function ChatInterface({
  userId,
  appraisalId,
  appraisalContext,
  onClose,
  onAddToCollection,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [hasAutoIntroduced, setHasAutoIntroduced] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isLoading, error, sendMessage, clearChat } = useChat({
    userId,
    appraisalId,
    appraisalContext,
  });

  // Check if this is a collection opportunity
  const hasCollectionOpportunity = appraisalContext?.collectionOpportunity?.isPartOfSet;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-introduce Stewart when chat opens (especially for collection items)
  useEffect(() => {
    if (!hasAutoIntroduced && messages.length === 0 && !isLoading && appraisalContext) {
      setHasAutoIntroduced(true);
      // Send a greeting trigger that prompts Stewart to introduce himself
      sendMessage("Hi Stewart!");
    }
  }, [hasAutoIntroduced, messages.length, isLoading, appraisalContext, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Collection-specific questions when collection opportunity is detected
  const suggestedQuestions = hasCollectionOpportunity
    ? [
        'Yes, I have more!',
        'What photos do you need?',
        'What would the full set be worth?',
      ]
    : appraisalContext
    ? [
        'What makes this valuable?',
        'Where should I sell this?',
        'How do I preserve it?',
      ]
    : [
        "What's my most valuable item?",
        'Should I get insurance?',
        'Market trends for my collection?',
      ];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        {/* Stewart Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0 mr-3">
          <span className="text-white text-lg font-bold">S</span>
        </div>
        <div className="min-w-0 flex-1 mr-2">
          <h3 className="font-semibold text-gray-900 truncate">
            Stewart
          </h3>
          <p className="text-xs text-gray-500 truncate">
            {appraisalContext ? appraisalContext.itemName : 'Your AI Appraiser'}
          </p>
        </div>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Clear chat"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading ? (
          <div className="text-center py-8">
            {/* Stewart's welcome avatar */}
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">S</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Meet Stewart</h4>
            <p className="text-gray-600 mb-4 text-sm">
              {hasCollectionOpportunity
                ? "I noticed something exciting about your item! Let's chat."
                : appraisalContext
                ? 'Your personal appraisal expert. Ask me anything!'
                : 'Ask about your collection'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => sendMessage(question)}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {/* Stewart typing indicator */}
        {isLoading && (
          <div className="flex justify-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action for Collection Items */}
      {hasCollectionOpportunity && onAddToCollection && (
        <div className="px-4 pt-2 border-t bg-gradient-to-r from-amber-50 to-orange-50">
          <button
            onClick={onAddToCollection}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
          >
            <CameraIcon className="w-5 h-5" />
            Add More Items to Collection
          </button>
          <p className="text-xs text-amber-700 text-center mt-2 mb-2">
            Complete your set to unlock the full collection value!
          </p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t pb-safe shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasCollectionOpportunity ? "Tell Stewart about your collection..." : "Ask a question..."}
            rows={1}
            className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-base"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {/* Stewart's avatar for assistant messages */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">S</span>
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl ${
          isUser
            ? 'bg-teal-500 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content || '...'}</p>
      </div>
    </div>
  );
}
