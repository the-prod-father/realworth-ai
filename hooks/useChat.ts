import { useState, useCallback, useRef } from 'react';
import { AppraisalResult } from '@/lib/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface UseChatOptions {
  userId: string;
  appraisalId?: string;
  appraisalContext?: AppraisalResult;
}

export function useChat({ userId, appraisalId, appraisalContext }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, appraisalId }),
      });

      if (response.ok) {
        const history = await response.json();
        setMessages(history);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  }, [userId, appraisalId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Create placeholder for assistant message
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message: content,
          appraisalId,
          appraisalContext,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        fullContent += text;

        // Update the assistant message with streamed content
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: fullContent }
              : msg
          )
        );
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      const errorMessage = (err as Error).message || 'Failed to send message';
      setError(errorMessage);

      // Remove the empty assistant message on error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessage.id));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [userId, appraisalId, appraisalContext, isLoading]);

  const clearChat = useCallback(async () => {
    try {
      await fetch('/api/chat/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, appraisalId }),
      });
      setMessages([]);
    } catch (err) {
      console.error('Error clearing chat:', err);
    }
  }, [userId, appraisalId]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    loadHistory,
    stopGeneration,
  };
}
