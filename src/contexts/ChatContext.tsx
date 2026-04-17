import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

interface Conversation {
  chat_room_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface ChatContextType {
  isOpen: boolean;
  openChat: (chatRoomId?: string) => void;
  closeChat: () => void;
  activeChatRoomId: string | null;
  setActiveChatRoomId: (id: string | null) => void;
  conversations: Conversation[];
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  loadingMessages: boolean;
  totalUnread: number;
}

const ChatContext = createContext<ChatContextType | null>(null);

const getLastSeen = (userId: string, roomId: string): string => {
  return localStorage.getItem(`chat_seen_${userId}_${roomId}`) || "1970-01-01";
};

const setLastSeen = (userId: string, roomId: string) => {
  localStorage.setItem(
    `chat_seen_${userId}_${roomId}`,
    new Date().toISOString(),
  );
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatRoomId, setActiveChatRoomIdState] = useState<string | null>(
    null,
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const channelRef = useRef<any>(null);
  const globalChannelRef = useRef<any>(null);

  const fetchConversations = async () => {
    if (!user) return;

    // Step 1: Get all chat_room_ids this user is part of
    const { data: participantRows } = await supabase
      .from("chat_participants")
      .select("chat_room_id")
      .eq("user_id", user.id);

    if (!participantRows || participantRows.length === 0) {
      setConversations([]);
      return;
    }

    const roomIds = [
      ...new Set(participantRows.map((p) => p.chat_room_id).filter(Boolean)),
    ];

    if (roomIds.length === 0) return;

    // Step 2: Get all OTHER participants in those rooms
    const { data: otherParticipants } = await supabase
      .from("chat_participants")
      .select("chat_room_id, user_id")
      .in("chat_room_id", roomIds)
      .neq("user_id", user.id);

    if (!otherParticipants || otherParticipants.length === 0) return;

    // Step 3: Deduplicate — one conversation per other_user_id
    // If same two users have multiple rooms, keep only the one with latest message
    const otherUserIds = [...new Set(otherParticipants.map((p) => p.user_id))];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", otherUserIds);

    // Step 4: Get all messages for these rooms
    const { data: allMessages } = await supabase
      .from("messages")
      .select("chat_room_id, message_text, created_at, sender_id")
      .in("chat_room_id", roomIds)
      .order("created_at", { ascending: false });

    // Step 5: Build conversation map — deduplicate by other_user_id
    // Keep only the room with the most recent message per user pair
    const convMap = new Map<string, Conversation>();

    for (const roomId of roomIds) {
      const other = otherParticipants.find((p) => p.chat_room_id === roomId);
      if (!other) continue;

      const otherUserId = other.user_id;
      const profile = profiles?.find((p) => p.id === otherUserId);
      const roomMessages = (allMessages || []).filter(
        (m) => m.chat_room_id === roomId,
      );
      const lastMsg = roomMessages[0]; // already sorted desc

      // Count unread from other user since last seen
      const lastSeen = getLastSeen(user.id, roomId);
      const unread = roomMessages.filter(
        (m) =>
          m.sender_id !== user.id &&
          new Date(m.created_at) > new Date(lastSeen),
      ).length;

      const conv: Conversation = {
        chat_room_id: roomId,
        other_user_id: otherUserId,
        other_user_name: profile?.name || "Unknown",
        other_user_avatar: (profile as any)?.avatar_url || "",
        last_message: lastMsg?.message_text || "",
        last_message_time: lastMsg?.created_at || "",
        unread_count: unread,
      };

      // Deduplicate: if this user already has a conversation entry,
      // keep the one with the more recent last message
      const existing = convMap.get(otherUserId);
      if (!existing) {
        convMap.set(otherUserId, conv);
      } else {
        const existingTime = existing.last_message_time
          ? new Date(existing.last_message_time).getTime()
          : 0;
        const newTime = conv.last_message_time
          ? new Date(conv.last_message_time).getTime()
          : 0;
        if (newTime > existingTime) {
          convMap.set(otherUserId, conv);
        }
      }
    }

    // Step 6: Sort by latest message time descending (newest on top)
    const sorted = Array.from(convMap.values()).sort((a, b) => {
      const aTime = a.last_message_time
        ? new Date(a.last_message_time).getTime()
        : 0;
      const bTime = b.last_message_time
        ? new Date(b.last_message_time).getTime()
        : 0;
      return bTime - aTime;
    });

    setConversations(sorted);
  };

  // Initial fetch
  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  // Global realtime listener — updates conversation list when ANY new message arrives
  useEffect(() => {
    if (!user) return;

    if (globalChannelRef.current)
      supabase.removeChannel(globalChannelRef.current);

    globalChannelRef.current = supabase
      .channel("global-messages-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          // Refetch all conversations to update last message + unread counts
          fetchConversations();
        },
      )
      .subscribe();

    return () => {
      if (globalChannelRef.current)
        supabase.removeChannel(globalChannelRef.current);
    };
  }, [user]);

  // Fetch messages + realtime for active chat room
  useEffect(() => {
    if (!activeChatRoomId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_room_id", activeChatRoomId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      setLoadingMessages(false);

      // Mark as seen immediately
      if (user) {
        setLastSeen(user.id, activeChatRoomId);
        fetchConversations();
      }
    };

    fetchMessages();

    // Cleanup old channel
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    // Subscribe to new messages in this room
    channelRef.current = supabase
      .channel(`sidebar-chat-${activeChatRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_room_id=eq.${activeChatRoomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          // Mark seen since chat is open
          if (user) {
            setLastSeen(user.id, activeChatRoomId);
            fetchConversations();
          }
        },
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [activeChatRoomId]);

  const openChat = (chatRoomId?: string) => {
    setIsOpen(true);
    if (chatRoomId) {
      setActiveChatRoomIdState(chatRoomId);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setActiveChatRoomIdState(null);
  };

  const setActiveChatRoomId = (id: string | null) => {
    if (id && user) {
      setLastSeen(user.id, id);
    }
    setActiveChatRoomIdState(id);
    setTimeout(fetchConversations, 100);
  };

  const sendMessage = async (content: string) => {
    if (!user || !activeChatRoomId || !content.trim()) return;
    await supabase.from("messages").insert({
      chat_room_id: activeChatRoomId,
      sender_id: user.id,
      message_text: content.trim(),
    });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        openChat,
        closeChat,
        activeChatRoomId,
        setActiveChatRoomId,
        conversations,
        messages,
        sendMessage,
        loadingMessages,
        totalUnread,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};
