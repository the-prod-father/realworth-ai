import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  userId: string;
  appraisalId: string | null;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

class ChatService {
  /**
   * Get chat history for an appraisal or global chat
   */
  async getChatHistory(userId: string, appraisalId?: string, limit: number = 20): Promise<ChatMessage[]> {
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (appraisalId) {
        query = query.eq('appraisal_id', appraisalId);
      } else {
        query = query.is('appraisal_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching chat history:', error);
        return [];
      }

      return (data || []).map(msg => ({
        id: msg.id,
        userId: msg.user_id,
        appraisalId: msg.appraisal_id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        createdAt: msg.created_at,
      }));
    } catch (error) {
      console.error('Error in getChatHistory:', error);
      return [];
    }
  }

  /**
   * Save a chat message
   */
  async saveMessage(
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    appraisalId?: string
  ): Promise<ChatMessage | null> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          appraisal_id: appraisalId || null,
          role,
          content,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving chat message:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        appraisalId: data.appraisal_id,
        role: data.role as 'user' | 'assistant',
        content: data.content,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error in saveMessage:', error);
      return null;
    }
  }

  /**
   * Delete chat history for an appraisal or global chat
   */
  async clearChatHistory(userId: string, appraisalId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);

      if (appraisalId) {
        query = query.eq('appraisal_id', appraisalId);
      } else {
        query = query.is('appraisal_id', null);
      }

      const { error } = await query;

      if (error) {
        console.error('Error clearing chat history:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in clearChatHistory:', error);
      return false;
    }
  }

  /**
   * Get the last N messages for context
   */
  async getRecentMessages(userId: string, appraisalId?: string, limit: number = 10): Promise<ChatMessage[]> {
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (appraisalId) {
        query = query.eq('appraisal_id', appraisalId);
      } else {
        query = query.is('appraisal_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recent messages:', error);
        return [];
      }

      // Reverse to get chronological order
      return (data || []).reverse().map(msg => ({
        id: msg.id,
        userId: msg.user_id,
        appraisalId: msg.appraisal_id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        createdAt: msg.created_at,
      }));
    } catch (error) {
      console.error('Error in getRecentMessages:', error);
      return [];
    }
  }
}

export const chatService = new ChatService();
