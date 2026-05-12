import { supabase } from './supabase';
import { Conversation, Message } from '../types';

export const chatService = {
  /**
   * Find an existing conversation between two users or create a new one.
   */
  async getOrCreateConversation(participantIds: string[], propertyId?: string): Promise<Conversation> {
    // Sort participant IDs for consistency
    const sortedParticipants = [...participantIds].sort();

    // Try to find existing conversation with these exact participants
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', sortedParticipants)
      .limit(1);

    if (existing && existing.length > 0) {
      // Filter manually to ensure EXACT match if contains is too loose
      const exactMatch = existing.find(c => 
        c.participants.length === sortedParticipants.length &&
        c.participants.every((p: string) => sortedParticipants.includes(p))
      );
      if (exactMatch) return exactMatch;
    }

    if (findError) console.error('Error finding conversation:', findError);

    // Create new conversation
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({
        participants: sortedParticipants,
        property_id: propertyId,
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw createError;
    return created;
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content,
        read: false
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  },

  /**
   * Fetch messages for a conversation.
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch all conversations for the current user.
   */
  async getConversations(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        property:properties(id, title, images),
        messages(content, created_at, sender_id, read)
      `)
      .contains('participants', [userId])
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Mark all messages in a conversation as read for the current user.
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false);

    if (error) console.error('Error marking messages as read:', error);
  },

  /**
   * Subscribe to new messages in a specific conversation.
   */
  subscribeToMessages(conversationId: string, onNewMessage: (message: Message) => void) {
    return supabase
      .channel(`room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          onNewMessage(payload.new as Message);
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to conversation updates (new conversations or updated timestamps).
   */
  subscribeToConversations(userId: string, onUpdate: () => void) {
    return supabase
      .channel(`user_conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participants=cs.{${userId}}`
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();
  }
};
