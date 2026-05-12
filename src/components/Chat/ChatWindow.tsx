import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, X, Loader2, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { chatService } from '../../lib/chatService';
import { Message, User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface ChatWindowProps {
  conversationId: string;
  currentUser: any;
  recipient: any;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function ChatWindow({ conversationId, currentUser, recipient, onClose, isEmbedded = false }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const data = await chatService.getMessages(conversationId);
        setMessages(data);
        await chatService.markAsRead(conversationId, currentUser.id);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = chatService.subscribeToMessages(conversationId, (msg) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      
      if (msg.sender_id !== currentUser.id) {
        chatService.markAsRead(conversationId, currentUser.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, currentUser.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      const content = newMessage.trim();
      setNewMessage('');
      await chatService.sendMessage(conversationId, currentUser.id, content);
    } catch (err) {
      console.error('Error sending message:', err);
      // Maybe restore message to input on error?
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-col bg-white",
      isEmbedded ? "h-full" : "fixed bottom-4 right-4 w-80 md:w-96 h-[500px] shadow-2xl rounded-2xl z-[100] border border-gray-100 overflow-hidden"
    )}>
      {/* Header */}
      <div className="bg-blue-600 p-4 flex items-center justify-between text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
            {recipient?.avatar_url ? (
              <img src={recipient.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">{recipient?.full_name || 'User'}</h3>
            <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">Online</p>
          </div>
        </div>
        {!isEmbedded && (
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scrollbar-hide"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <UserIcon className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-sm font-bold text-gray-500">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id;
            const showTime = index === 0 || 
              new Date(msg.created_at).getTime() - new Date(messages[index-1].created_at).getTime() > 1000 * 60 * 5;

            return (
              <div key={msg.id} className="space-y-1">
                {showTime && (
                  <div className="text-center py-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 py-1 bg-white rounded-full">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className={cn(
                  "flex items-end gap-2",
                  isMe ? "flex-row-reverse" : "flex-row"
                )}>
                  {!isMe && (
                    <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mb-1 overflow-hidden">
                      {recipient?.avatar_url ? (
                        <img src={recipient.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-3 w-3 text-gray-500" />
                      )}
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl shadow-sm",
                    isMe 
                      ? "bg-blue-600 text-white rounded-br-none" 
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                  )}>
                    <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                    {isMe && (
                      <div className="flex justify-end mt-1">
                        {msg.read ? (
                          <CheckCheck className="h-3 w-3 text-blue-200" />
                        ) : (
                          <Check className="h-3 w-3 text-blue-200" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-bold"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none active:scale-95"
          >
            <Send className={cn("h-5 w-5", isSending ? "animate-pulse" : "")} />
          </button>
        </div>
      </form>
    </div>
  );
}
