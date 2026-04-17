import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, User, Clock, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import type { Event } from "@/lib/mock-data";
import { Link } from "react-router-dom";

const joinSchema = z.object({
  skills: z.string().trim().min(1, "Skills are required").max(500),
  message: z.string().trim().min(1, "Message is required").max(1000),
});

const mapEvent = (e: any): Event => ({
  id: e.id,
  title: e.title,
  description: e.description,
  organizerId: e.organizer_id,
  organizerName: e.organizer_name,
  skillsRequired: e.skills_required || [],
  teamSize: e.team_size,
  participantsJoined: e.participants_joined,
  deadline: e.deadline || "",
  domain: e.domain,
  mode: e.mode as "online" | "offline",
  location: e.location || undefined,
  image: e.image_url || undefined,
});

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [joinOpen, setJoinOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [skills, setSkills] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingUsers,setLoadingUsers] = useState(false);
   interface Profile {
     id: string;
     name: string;
     email: string;
     avatar_url?: string;
     skills?: string[];
     bio?: string;
     score?: number;
     matchReasons?: string[];
   }

   const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);

  const { data: event } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", id!)
        .single();
      if (data) return mapEvent(data);
      return null;
    },
  });

  if (!event) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  // ✅ Check if current user is the organizer
  const isOrganizer = user?.id === event.organizerId;

  const handleJoinClick = () => {
    if (!user) {
      setLoginPromptOpen(true);
      return;
    }
    if (profile?.skills?.length) {
      setSkills(profile.skills.join(", "));
    }
    setJoinOpen(true);
  };

  // ✨ AI Write Message
  const handleAIWrite = () => {
    if (!skills.trim()) {
      toast.error("Please enter your skills first!");
      return;
    }

    const skillList = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const requiredSkills = event.skillsRequired?.join(", ") || event.domain;
    const name = profile?.name || "I";

    const generated = `Hi, ${name === "I" ? "I" : `my name is ${name} and I`} am excited to join "${event.title}". I bring strong skills in ${skillList.join(", ")}, which align well with the required skills (${requiredSkills}). I am passionate about ${event.domain} and would love to contribute meaningfully to this team.`;

    setMessage(generated);
    toast.success("Message generated! ✨ Feel free to edit it.");
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = joinSchema.safeParse({ skills, message });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("event_requests").insert({
        event_id: event.id,
        sender_id: user.id,
        receiver_id: event.organizerId,
        message: `Skills: ${skills}\n\n${message}`,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Join request sent! The organizer will review it.");
      setJoinOpen(false);
      setSkills("");
      setMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  const slotsLeft = event.teamSize - event.participantsJoined;

  
  const handleInvite = async (receiverId: string) => {
    try {
      const { error } = await supabase.from("event_requests").insert({
        event_id: event.id,
        sender_id: user?.id,
        receiver_id: receiverId,
        message: `You are invited to join "${event.title}"`,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Invite sent!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  const handleFindTeammates = async () => {
    setLoadingUsers(true);

    try {
      // 🔹 Get users who already got request
      const { data: existingRequests } = await supabase
        .from("event_requests")
        .select("receiver_id")
        .eq("event_id", event.id);

      const alreadyInvited = (existingRequests || []).map(
        (r: any) => r.receiver_id,
      );

      // 🔹 Fetch all profiles except organizer
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url, skills, bio")
        .neq("id", user?.id);

      if (error) throw error;

      // 🔹 Filter users already invited
      const candidates = (data || []).filter(
        (p: any) => !alreadyInvited.includes(p.id),
      );

      const requiredSkills = event.skillsRequired || [];

      // 🔹 AI matching logic
      const scored = candidates.map((p: any) => {
        const theirSkills = Array.isArray(p.skills)
          ? p.skills
          : (p.skills || "").split(",").map((s: string) => s.trim());

        const matchedSkills = requiredSkills.filter((req) =>
          theirSkills.some(
            (s: string) => s.toLowerCase() === req.toLowerCase(),
          ),
        );

        const score = matchedSkills.length;

        const matchReasons =
          matchedSkills.length > 0
            ? [`Knows ${matchedSkills.join(", ")}`]
            : ["Different skill set — useful diversity"];

        return {
          ...p,
          skills: theirSkills,
          score,
          matchReasons,
        };
      });

      const topMatches = scored
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

      setSuggestedUsers(topMatches);
    } catch (err) {
      console.error(err);
      toast.error("Failed to find teammates");
    } finally {
      setLoadingUsers(false);
    }
  };
  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {event.image && (
          <div className="mb-6 overflow-hidden rounded-xl">
            <img
              src={event.image}
              alt={event.title}
              className="h-64 w-full object-cover"
            />
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {event.domain}
          </Badge>
          <Badge
            variant={event.mode === "online" ? "default" : "outline"}
            className={event.mode === "online" ? "gradient-bg border-0" : ""}
          >
            <MapPin className="mr-1 h-3 w-3" />
            {event.mode === "online" ? "Online" : "Offline"}
          </Badge>
          {/* ✅ Show "Your Event" badge if organizer */}
          {isOrganizer && (
            <Badge className="border-0 bg-green-100 text-green-700">
              Your Event
            </Badge>
          )}
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            {event.title}
          </h1>

          {isOrganizer && (
            <Button
              variant="outline"
              onClick={() => navigate(`/edit-event/${event.id}`)}
            >
              Edit
            </Button>
          )}
        </div>
        <p className="mb-6 flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" /> Organized by{" "}
          {isOrganizer ? (
            <span className="font-medium text-foreground">
              {event.organizerName}
            </span>
          ) : (
            <Link
              to={`/user/${event.organizerId}`}
              className="font-medium text-primary hover:underline"
            >
              {event.organizerName}
            </Link>
          )}
        </p>
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> Team Size
            </div>
            <p className="mt-1 text-lg font-semibold">
              {event.participantsJoined} / {event.teamSize} members
            </p>
            {slotsLeft > 0 && (
              <p className="text-sm text-success">
                {slotsLeft} slots remaining
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" /> Deadline
            </div>
            <p className="mt-1 text-lg font-semibold">
              {new Date(event.deadline).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> Status
            </div>
            <p className="mt-1 text-lg font-semibold">
              {new Date(event.deadline) > new Date() ? "Open" : "Closed"}
            </p>
          </div>
        </div>

        {event.mode === "offline" && event.location && (
          <div className="mb-8 rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> Location
            </div>
            <p className="mt-1 text-lg font-semibold">{event.location}</p>
          </div>
        )}

        <div className="mb-8">
          <h2 className="mb-3 font-display text-xl font-semibold">
            Description
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 font-display text-xl font-semibold">
            Skills Required
          </h2>
          <div className="flex flex-wrap gap-2">
            {event.skillsRequired.map((s) => (
              <Badge key={s} variant="outline" className="px-3 py-1">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        {isOrganizer && (
          <Button
            className="mt-4 gradient-bg text-primary-foreground"
            onClick={handleFindTeammates}
          >
            Find Teammates with AI
          </Button>
        )}
        {loadingUsers && (
          <p className="mt-3 text-sm text-muted-foreground">
            Finding best teammates...
          </p>
        )}
        {isOrganizer && suggestedUsers.length > 0 && (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-primary">
                AI Suggested Teammates
              </p>
            </div>

            <div className="space-y-3">
              {suggestedUsers.map((u, index) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3"
                >
                  {/* Rank */}
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/user/${u.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {u.name}
                      </Link>

                      {u.score! > 0 && (
                        <span className="text-xs text-green-600">
                          ⭐ {u.score}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {u.matchReasons?.[0]}
                    </p>

                    {u.skills && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {u.skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Invite */}
                  <Button size="sm" onClick={() => handleInvite(u.id)}>
                    Invite
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ Only show Send Join Request button if user is NOT the organizer */}
        {!isOrganizer && (
          <Button
            size="lg"
            className="gradient-bg text-primary-foreground"
            onClick={handleJoinClick}
            disabled={slotsLeft <= 0}
          >
            {slotsLeft > 0 ? "Send Join Request" : "Team Full"}
          </Button>
        )}
      </div>

      {/* Login Prompt Dialog */}
      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              Please login or signup to send a join request.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 gradient-bg text-primary-foreground"
              onClick={() => navigate(`/login?redirect=/event/${id}`)}
            >
              Login
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/signup?redirect=/event/${id}`)}
            >
              Sign Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Request Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Join Request</DialogTitle>
            <DialogDescription>
              The organizer will receive your request and contact you via email
              if interested.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <Label htmlFor="join-skills">Your Skills</Label>
              <Input
                id="join-skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, Python, Machine Learning"
                maxLength={500}
                required
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="join-message">Message to Organizer</Label>
                <button
                  type="button"
                  onClick={handleAIWrite}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-all hover:bg-primary/20 disabled:opacity-60"
                >
                  <Sparkles className="h-3 w-3" />
                  {aiLoading ? "Writing..." : "Write with AI"}
                </button>
              </div>
              <Textarea
                id="join-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="I'd love to join because..."
                maxLength={1000}
                rows={4}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                💡 Enter your skills above then click "Write with AI" to
                auto-generate a message
              </p>
            </div>
            <Button
              type="submit"
              className="w-full gradient-bg text-primary-foreground"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send Join Request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetails;
