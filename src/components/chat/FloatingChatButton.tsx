import { MessageCircle } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/lib/auth-context";

export function FloatingChatButton() {
  const { openChat, totalUnread } = useChat();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <button
      onClick={() => openChat()}
      style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 30 }}
      className="w-14 h-14 gradient-bg text-primary-foreground rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 relative"
      aria-label="Open messages"
    >
      <MessageCircle className="w-6 h-6" />

      {/* ✅ Shows ONLY unread count — hides completely when 0 */}
      {totalUnread > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            backgroundColor: "#ef4444",
            color: "white",
            fontSize: "11px",
            fontWeight: 700,
            borderRadius: "999px",
            minWidth: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 5px",
            border: "2px solid white",
            // ✅ Pulse animation when new message arrives
            animation: "pulse 2s infinite",
          }}
        >
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </button>
  );
}
