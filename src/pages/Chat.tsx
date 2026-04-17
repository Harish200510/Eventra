import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  ArrowLeft,
  MessageCircle,
  Reply,
  Trash2,
  CornerUpLeft,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

// Parse reply prefix from message text
const parseMessage = (text: string) => {
  if (text.startsWith("↩ Replying to:")) {
    const lines = text.split("\n");
    const replyPreview = lines[0]
      .replace("↩ Replying to: ", "")
      .replace(/^"|"$/g, "");
    const actualText = lines.slice(1).join("\n");
    return { isReply: true, replyPreview, actualText };
  }
  return { isReply: false, replyPreview: "", actualText: text };
};

const Chat = () => {
  const { chatRoomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    text: string;
    senderName: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", chatRoomId],
    enabled: !!chatRoomId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_room_id", chatRoomId!)
        .order("created_at", { ascending: true });
      return (data || []) as Message[];
    },
    refetchInterval: 3000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["chat-participants", chatRoomId],
    enabled: !!chatRoomId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("chat_room_id", chatRoomId!);
      const userIds = (data || []).map((p) => p.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);
      return profiles || [];
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!chatRoomId || !user) return;
    const channel = supabase
      .channel(`chat-${chatRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", chatRoomId],
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, user, queryClient]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const getProfile = (id: string) => participants.find((p: any) => p.id === id);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatRoomId) return;
    setSending(true);

    const content = replyTo
      ? `↩ Replying to: "${replyTo.text.slice(0, 40)}${replyTo.text.length > 40 ? "..." : ""}"\n${newMessage}`
      : newMessage;

    try {
      await supabase.from("messages").insert({
        chat_room_id: chatRoomId,
        sender_id: user.id,
        message_text: content.trim(),
      });
      setNewMessage("");
      setReplyTo(null);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUnsend = async (msgId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", msgId);
    if (error) {
      toast.error("Failed to unsend message");
    } else {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", chatRoomId],
      });
    }
    setHoveredMsgId(null);
  };

  const handleReply = (msg: Message) => {
    const isMe = msg.sender_id === user?.id;
    const sender = getProfile(msg.sender_id) as any;
    const senderName = isMe ? "You" : sender?.name || "Them";
    const { actualText } = parseMessage(msg.message_text);
    setReplyTo({ id: msg.id, text: actualText, senderName });
    inputRef.current?.focus();
    setHoveredMsgId(null);
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Please log in to access chat.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex h-[calc(100vh-4rem)] flex-col px-4 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <MessageCircle className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-display font-semibold">Team Chat</h2>
          <p className="text-xs text-muted-foreground">
            {participants.length} member{participants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="ml-auto flex -space-x-2">
          {participants.slice(0, 5).map((p: any) => (
            <Avatar key={p.id} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={p.avatar_url || ""} />
              <AvatarFallback className="gradient-bg text-xs text-primary-foreground">
                {(p.name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-card"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">
              No messages yet. Say hello! 👋
            </p>
          </div>
        )}
        <div className="space-y-2">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            const sender = getProfile(msg.sender_id);
            const isHovered = hoveredMsgId === msg.id;
            const { isReply, replyPreview, actualText } = parseMessage(
              msg.message_text,
            );

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 group ${isMe ? "justify-end" : "justify-start"}`}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                {/* ✅ Action buttons for MY messages (left of bubble) */}
                {isMe && (
                  <div
                    className={`flex items-center gap-1 mb-5 transition-opacity duration-150 ${isHovered ? "opacity-100" : "opacity-0"}`}
                  >
                    <button
                      onClick={() => handleReply(msg)}
                      className="p-1.5 rounded-full bg-secondary hover:bg-muted transition-colors"
                      title="Reply"
                    >
                      <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleUnsend(msg.id)}
                      className="p-1.5 rounded-full bg-secondary hover:bg-red-100 transition-colors group/del"
                      title="Unsend"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover/del:text-red-500" />
                    </button>
                  </div>
                )}

                {/* Avatar for other person */}
                {!isMe && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={(sender as any)?.avatar_url || ""} />
                    <AvatarFallback className="bg-secondary text-xs">
                      {((sender as any)?.name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Bubble */}
                <div
                  className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}
                >
                  {!isMe && (
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {(sender as any)?.name || "Unknown"}
                    </p>
                  )}

                  {/* ✅ Reply preview */}
                  {isReply && (
                    <div
                      className={`flex items-center gap-1 px-2 py-1 mb-0.5 rounded-lg text-[10px] text-muted-foreground bg-muted/60 max-w-full ${isMe ? "self-end" : "self-start"}`}
                    >
                      <CornerUpLeft className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{replyPreview}</span>
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm ${
                      isMe
                        ? "gradient-bg text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}
                  >
                    {actualText}
                  </div>
                  <p
                    className={`mt-1 text-[10px] text-muted-foreground ${isMe ? "text-right" : ""}`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* ✅ Reply button for OTHER person's messages (right of bubble) */}
                {!isMe && (
                  <div
                    className={`flex items-center mb-5 transition-opacity duration-150 ${isHovered ? "opacity-100" : "opacity-0"}`}
                  >
                    <button
                      onClick={() => handleReply(msg)}
                      className="p-1.5 rounded-full bg-secondary hover:bg-muted transition-colors"
                      title="Reply"
                    >
                      <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ Reply preview bar */}
      {replyTo && (
        <div className="mt-2 px-4 py-2 rounded-lg border border-border bg-muted/30 flex items-center gap-2">
          <CornerUpLeft className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">
              {replyTo.senderName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.text}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 hover:bg-muted rounded-full shrink-0"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="mt-3 flex gap-3">
        <Input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={replyTo ? "Write a reply..." : "Type a message..."}
          className="flex-1"
          maxLength={2000}
        />
        <Button
          type="submit"
          className="gradient-bg text-primary-foreground"
          disabled={sending || !newMessage.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default Chat;
