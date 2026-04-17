import { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  ArrowLeft,
  MessageCircle,
  Reply,
  Trash2,
  CornerUpLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ChatSidebar() {
  const {
    isOpen,
    closeChat,
    conversations,
    activeChatRoomId,
    setActiveChatRoomId,
    messages,
    sendMessage,
    loadingMessages,
  } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: string;
    text: string;
    senderName: string;
  } | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear reply when changing conversation
  useEffect(() => {
    setReplyTo(null);
    setInput("");
  }, [activeChatRoomId]);

  const activeConv = conversations.find(
    (c) => c.chat_room_id === activeChatRoomId,
  );

  const handleSend = async () => {
    if (!input.trim()) return;
    const content = replyTo
      ? `↩ Replying to: "${replyTo.text.slice(0, 40)}${replyTo.text.length > 40 ? "..." : ""}"\n${input}`
      : input;
    await sendMessage(content);
    setInput("");
    setReplyTo(null);
  };

  const handleUnsend = async (msgId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", msgId);
    if (error) {
      toast.error("Failed to delete message");
    }
  };

  const handleReply = (msg: any) => {
    const isMe = msg.sender_id === user?.id;
    const senderName = isMe ? "You" : activeConv?.other_user_name || "Them";
    setReplyTo({ id: msg.id, text: msg.message_text, senderName });
    inputRef.current?.focus();
    setHoveredMsgId(null);
  };

  const formatTime = (iso: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday)
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Parse reply prefix from message text
  const parseMessage = (text: string) => {
    if (text.startsWith("↩ Replying to:")) {
      const lines = text.split("\n");
      const replyLine = lines[0]
        .replace("↩ Replying to: ", "")
        .replace(/^"|"$/g, "");
      const actualText = lines.slice(1).join("\n");
      return { isReply: true, replyPreview: replyLine, actualText };
    }
    return { isReply: false, replyPreview: "", actualText: text };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={closeChat}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[380px] bg-background border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              {activeChatRoomId && (
                <button
                  onClick={() => setActiveChatRoomId(null)}
                  className="p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="font-display font-semibold text-lg flex-1">
                {activeConv ? activeConv.other_user_name : "Messages"}
              </h2>
              <button
                onClick={closeChat}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation List */}
            {!activeChatRoomId && (
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <MessageCircle className="w-10 h-10 opacity-40" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const hasUnread = conv.unread_count > 0;
                    return (
                      <button
                        key={conv.chat_room_id}
                        onClick={() => setActiveChatRoomId(conv.chat_room_id)}
                        className="w-full flex items-center gap-3 border-b border-border text-left transition-all"
                        style={{
                          padding: "12px 16px",
                          backgroundColor: hasUnread
                            ? "rgba(109, 40, 217, 0.1)"
                            : "transparent",
                          borderLeft: hasUnread
                            ? "4px solid rgb(109, 40, 217)"
                            : "4px solid transparent",
                        }}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-11 w-11">
                            <AvatarImage src={conv.other_user_avatar} />
                            <AvatarFallback className="gradient-bg text-primary-foreground text-sm font-semibold">
                              {conv.other_user_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {hasUnread && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p
                              className="text-sm truncate"
                              style={{
                                fontWeight: hasUnread ? 700 : 500,
                                color: hasUnread
                                  ? "rgb(109,40,217)"
                                  : "inherit",
                              }}
                            >
                              {conv.other_user_name}
                            </p>
                            <span
                              className="text-[10px] shrink-0 ml-2"
                              style={{
                                color: hasUnread
                                  ? "rgb(109,40,217)"
                                  : "rgb(156,163,175)",
                                fontWeight: hasUnread ? 600 : 400,
                              }}
                            >
                              {formatTime(conv.last_message_time)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className="text-xs truncate"
                              style={{
                                color: hasUnread
                                  ? "rgb(30,30,30)"
                                  : "rgb(156,163,175)",
                                fontWeight: hasUnread ? 600 : 400,
                              }}
                            >
                              {conv.last_message || "No messages yet"}
                            </p>
                            {hasUnread && (
                              <span className="shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                                {conv.unread_count > 9
                                  ? "9+"
                                  : conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Messages View */}
            {activeChatRoomId && (
              <>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Loading...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Say hello! 👋
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      const isHovered = hoveredMsgId === msg.id;
                      const { isReply, replyPreview, actualText } =
                        parseMessage(msg.message_text);

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-1 group ${isMe ? "justify-end" : "justify-start"}`}
                          onMouseEnter={() => setHoveredMsgId(msg.id)}
                          onMouseLeave={() => setHoveredMsgId(null)}
                        >
                          {/* ✅ Action buttons — LEFT side for my messages, RIGHT for theirs */}
                          {isMe && isHovered && (
                            <div className="flex items-center gap-1 mb-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Reply */}
                              <button
                                onClick={() => handleReply(msg)}
                                className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                                title="Reply"
                              >
                                <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              {/* Unsend — only for my messages */}
                              <button
                                onClick={() => handleUnsend(msg.id)}
                                className="p-1.5 rounded-full bg-muted hover:bg-red-100 hover:text-red-500 transition-colors"
                                title="Unsend"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                              </button>
                            </div>
                          )}

                          {/* Bubble */}
                          <div
                            className={`max-w-[72%] flex flex-col ${isMe ? "items-end" : "items-start"}`}
                          >
                            {/* Reply preview */}
                            {isReply && (
                              <div
                                className={`flex items-center gap-1 px-2 py-1 mb-0.5 rounded-lg text-[10px] text-muted-foreground bg-muted/60 max-w-full ${isMe ? "self-end" : "self-start"}`}
                              >
                                <CornerUpLeft className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{replyPreview}</span>
                              </div>
                            )}
                            <div
                              className={`px-3 py-2 rounded-2xl text-sm ${
                                isMe
                                  ? "gradient-bg text-primary-foreground rounded-br-sm"
                                  : "bg-muted text-foreground rounded-bl-sm"
                              }`}
                            >
                              {actualText}
                              <p
                                className={`text-[10px] mt-0.5 opacity-70 ${isMe ? "text-right" : ""}`}
                              >
                                {new Date(msg.created_at).toLocaleTimeString(
                                  "en-US",
                                  { hour: "numeric", minute: "2-digit" },
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Reply button for other person's messages */}
                          {!isMe && isHovered && (
                            <div className="flex items-center gap-1 mb-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleReply(msg)}
                                className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                                title="Reply"
                              >
                                <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* ✅ Reply preview bar */}
                {replyTo && (
                  <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2">
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
                <div className="p-4 border-t border-border flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={replyTo ? "Write a reply..." : "Message..."}
                    className="flex-1 border border-border rounded-full px-4 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-9 h-9 gradient-bg text-primary-foreground rounded-full flex items-center justify-center disabled:opacity-40 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
