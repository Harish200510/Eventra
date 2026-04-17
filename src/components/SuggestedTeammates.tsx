import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Event } from "@/lib/mock-data";

interface SuggestedTeammatesProps {
  event: Event;
}

const SuggestedTeammates = ({ event }: SuggestedTeammatesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data: matchingUsers = [] } = useQuery({
    queryKey: ["suggested-teammates", event.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      if (!data) return [];
      return data
        .filter(p => p.id !== user?.id && p.id !== event.organizerId)
        .map(p => {
          const skills = (p.skills || []) as string[];
          const matchCount = event.skillsRequired.filter(s =>
            skills.some(us => us.toLowerCase() === s.toLowerCase())
          ).length;
          return { ...p, skills, matchCount };
        })
        .filter(p => p.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 6);
    },
  });

  const { data: existingRequests = [] } = useQuery({
    queryKey: ["sent-invites", event.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_requests")
        .select("receiver_id")
        .eq("event_id", event.id)
        .eq("sender_id", user!.id);
      return (data || []).map(r => r.receiver_id);
    },
  });

  const handleInvite = async () => {
    if (!user || !selectedUserId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("event_requests").insert({
        event_id: event.id,
        sender_id: user.id,
        receiver_id: selectedUserId,
        message,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Invitation sent!");
      setInviteOpen(false);
      setMessage("");
      setSelectedUserId(null);
      queryClient.invalidateQueries({ queryKey: ["sent-invites", event.id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  if (matchingUsers.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
        <UserPlus className="h-5 w-5 text-primary" /> Suggested Teammates
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matchingUsers.map(u => {
          const alreadySent = existingRequests.includes(u.id);
          return (
            <div key={u.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover">
              <Avatar className="h-10 w-10">
                <AvatarImage src={u.avatar_url || ""} />
                <AvatarFallback className="gradient-bg text-primary-foreground text-sm">
                  {(u.name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-card-foreground">{u.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {u.skills.slice(0, 3).map(s => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant={alreadySent ? "ghost" : "default"}
                  className={`mt-2 w-full ${alreadySent ? "" : "gradient-bg text-primary-foreground"}`}
                  disabled={alreadySent}
                  onClick={() => { setSelectedUserId(u.id); setInviteOpen(true); }}
                >
                  {alreadySent ? "Invited" : <><Send className="mr-1 h-3 w-3" /> Send Request</>}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Team Invitation</DialogTitle>
            <DialogDescription>Invite this user to join "{event.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Message (optional)</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="We'd love to have you on our team..." maxLength={500} rows={3} />
            </div>
            <Button className="w-full gradient-bg text-primary-foreground" disabled={sending} onClick={handleInvite}>
              {sending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuggestedTeammates;
