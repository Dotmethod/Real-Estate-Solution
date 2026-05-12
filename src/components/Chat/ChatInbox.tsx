import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { chatService } from '../../lib/chatService';
import { User, Message, Conversation } from '../../types';
import { MessageSquare, User as UserIcon, Loader2, Building2, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatInboxProps {
  currentUser: any;
  onSelectConversation: (convo: any) => void;
  selectedId?: string;
}

export default function ChatInbox({ currentUser, onSelectConversation, selectedId }: ChatInboxProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const data = await chatService.getConversations(currentUser.id);
        
        // Fetch participant details for each conversation
        const enrichedConvos = await Promise.all(data.map(async (convo) => {
          const otherId = convo.participants.find((id: string) => id !== currentUser.id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherId)
            .single();
          
          return { ...convo, recipient: profile };
        }));

        setConversations(enrichedConvos);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();

    const subscription = chatService.subscribeToConversations(currentUser.id, () => {
      fetchConversations();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser.id]);

  const filteredConversations = conversations.filter(convo => {
    const name = convo.recipient?.full_name?.toLowerCase() || '';
    const propertyTitle = convo.property?.title?.toLowerCase() || '';
    const lastMsg = convo.messages?.[0]?.content?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return name.includes(query) || propertyTitle.includes(query) || lastMsg.includes(query);
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Search Header */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
          Messages
          {conversations.some(c => c.messages?.some((m: any) => m.sender_id !== currentUser.id && !m.read)) && (
            <span className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></span>
          )}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all font-bold"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-400">No messages found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredConversations.map((convo) => {
              const lastMsg = convo.messages?.[convo.messages.length - 1];
              const unreadCount = convo.messages?.filter((m: any) => m.sender_id !== currentUser.id && !m.read).length;
              const isActive = selectedId === convo.id;

              return (
                <button
                  key={convo.id}
                  onClick={() => onSelectConversation(convo)}
                  className={cn(
                    "w-full p-4 flex items-center gap-4 transition-all hover:bg-gray-50 text-left relative",
                    isActive && "bg-blue-50/50 hover:bg-blue-50"
                  )}
                >
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-600 rounded-r-lg"></div>}
                  
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                      {convo.recipient?.avatar_url ? (
                        <img src={convo.recipient.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">
                        {unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={cn("text-sm truncate pr-2 font-bold", unreadCount > 0 ? "text-gray-900" : "text-gray-700")}>
                        {convo.recipient?.full_name || 'Anonymous User'}
                      </h3>
                      {lastMsg && (
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter whitespace-nowrap">
                          {new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mb-1">
                      {convo.property && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded text-[9px] font-black text-blue-600 uppercase tracking-tighter border border-blue-100/50">
                          <Building2 className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[100px]">{convo.property.title}</span>
                        </div>
                      )}
                    </div>

                    <p className={cn(
                      "text-xs truncate leading-tight",
                      unreadCount > 0 ? "text-gray-900 font-bold" : "text-gray-500 font-medium"
                    )}>
                      {lastMsg ? lastMsg.content : 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
