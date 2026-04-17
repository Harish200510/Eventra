import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Inbox, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useChat } from "@/contexts/ChatContext";

interface RequestRow {
  id: string;
  event_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  status: string;
  created_at: string;
  chat_room_id?: string;
}

const Requests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { openChat } = useChat();

  const { data: received = [], refetch: refetchReceived } = useQuery({
    queryKey: ["requests-received", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_requests")
        .select("*")
        .eq("receiver_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []) as RequestRow[];
    },
  });

  const { data: sent = [], refetch: refetchSent } = useQuery({
    queryKey: ["requests-sent", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_requests")
        .select("*")
        .eq("sender_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []) as RequestRow[];
    },
  });

  const allUserIds = [
    ...new Set([
      ...received.map((r) => r.sender_id),
      ...sent.map((r) => r.receiver_id),
    ]),
  ];
  const allEventIds = [
    ...new Set([
      ...received.map((r) => r.event_id),
      ...sent.map((r) => r.event_id),
    ]),
  ];

  const { data: profiles = [] } = useQuery({
    queryKey: ["request-profiles", allUserIds],
    enabled: allUserIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url, skills")
        .in("id", allUserIds);
      return data || [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["request-events", allEventIds],
    enabled: allEventIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title")
        .in("id", allEventIds);
      return data || [];
    },
  });

  const getProfile = (id: string) => profiles.find((p) => p.id === id);
  const getEvent = (id: string) => events.find((e) => e.id === id);

  const handleAction = async (
    req: RequestRow,
    status: "accepted" | "rejected",
  ) => {
    try {
      if (status === "accepted") {
        const { data: room, error: roomErr } = await supabase
          .from("chat_rooms")
          .insert([{} as any])
          .select("id")
          .single();
        if (roomErr) throw roomErr;

        await supabase.from("chat_participants").insert([
          { chat_room_id: room.id, user_id: req.receiver_id },
          { chat_room_id: room.id, user_id: req.sender_id },
        ]);

        const { error: updateErr } = await supabase
          .from("event_requests")
          .update({ status: "accepted", chat_room_id: room.id })
          .eq("id", req.id);
        if (updateErr) throw updateErr;

        toast.success("Request accepted! Chat created.");
        await refetchReceived();
        await refetchSent();
        openChat(room.id);
      } else {
        const { error: updateErr } = await supabase
          .from("event_requests")
          .update({ status: "rejected" })
          .eq("id", req.id);
        if (updateErr) throw updateErr;
        toast.success("Request rejected.");
        await refetchReceived();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update request");
    }
  };

  const statusColor = (s: string) => {
    if (s === "accepted") return "bg-success/10 text-success border-success/20";
    if (s === "rejected")
      return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-warning/10 text-warning border-warning/20";
  };

  const pendingCount = received.filter((r) => r.status === "pending").length;

  const renderRequestCard = (req: RequestRow, type: "received" | "sent") => {
    const otherUser =
      type === "received"
        ? getProfile(req.sender_id)
        : getProfile(req.receiver_id);
    const otherUserId = type === "received" ? req.sender_id : req.receiver_id;
    const event = getEvent(req.event_id);

    return (
      <div
        key={req.id}
        className="rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover"
      >
        <div className="mb-3 flex items-start gap-3">
          {/* ✅ Clickable avatar */}
          <Link to={`/user/${otherUserId}`} className="shrink-0">
            <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary transition-all">
              <AvatarImage src={otherUser?.avatar_url || ""} />
              <AvatarFallback className="gradient-bg text-sm text-primary-foreground">
                {(otherUser?.name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-card-foreground">
              {event?.title || "Unknown Event"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {type === "received" ? "From" : "To"}: {/* ✅ Clickable name */}
              <Link
                to={`/user/${otherUserId}`}
                className="font-medium text-primary hover:underline"
              >
                {otherUser?.name || "Unknown"}
              </Link>
              {otherUser?.email && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({otherUser.email})
                </span>
              )}
            </p>
          </div>
          <Badge variant="outline" className={statusColor(req.status)}>
            {req.status}
          </Badge>
        </div>

        {req.message && (
          <p className="mb-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground italic">
            "{req.message}"
          </p>
        )}

        {otherUser?.skills && (otherUser.skills as string[]).length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(otherUser.skills as string[]).slice(0, 4).map((s) => (
              <Badge key={s} variant="outline" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date(req.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>

          {type === "received" && req.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gradient-bg text-primary-foreground"
                onClick={() => handleAction(req, "accepted")}
              >
                <Check className="mr-1 h-3 w-3" /> Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction(req, "rejected")}
              >
                <X className="mr-1 h-3 w-3" /> Reject
              </Button>
            </div>
          )}

          {req.status === "accepted" && req.chat_room_id && (
            <Button
              size="sm"
              variant="ghost"
              className="text-primary"
              onClick={() => openChat(req.chat_room_id!)}
            >
              <MessageCircle className="mr-1 h-3 w-3" /> Open Chat
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">
          Please log in to view your requests.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Requests</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your team invitations and join requests
        </p>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="received" className="gap-2">
            <Inbox className="h-4 w-4" /> Received
            {pendingCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full gradient-bg text-xs text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-4 w-4" /> Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          <div className="grid gap-4 md:grid-cols-2">
            {received.map((r) => renderRequestCard(r, "received"))}
          </div>
          {received.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">
              No requests received yet.
            </p>
          )}
        </TabsContent>

        <TabsContent value="sent">
          <div className="grid gap-4 md:grid-cols-2">
            {sent.map((r) => renderRequestCard(r, "sent"))}
          </div>
          {sent.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">
              No requests sent yet.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Requests;
