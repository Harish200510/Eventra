import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Mail, Github, Linkedin, Globe, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import EventCard from "@/components/EventCard";
import { useQuery } from "@tanstack/react-query";
import type { Event } from "@/lib/mock-data";

const mapEvent = (e: any): Event => ({
  id: e.id, title: e.title, description: e.description,
  organizerId: e.organizer_id, organizerName: e.organizer_name,
  skillsRequired: e.skills_required || [], teamSize: e.team_size,
  participantsJoined: e.participants_joined, deadline: e.deadline || "",
  domain: e.domain, mode: e.mode as "online" | "offline",
});

const Profile = () => {
  const { user, profile } = useAuth();

  const { data: participantEventIds = [] } = useQuery({
    queryKey: ["my-participations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("event_participants").select("event_id").eq("user_id", user!.id);
      return (data || []).map((p) => p.event_id);
    },
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*");
      return (data || []).map(mapEvent);
    },
  });

  if (!profile)
    return <div className="p-10 text-center">Loading profile...</div>;
  const joinedEvents = allEvents.filter((e) => participantEventIds.includes(e.id));
  const createdEvents = allEvents.filter((e) => e.organizerId === user?.id);

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 rounded-lg border border-border bg-card p-8 shadow-card">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="gradient-bg text-2xl font-bold text-primary-foreground">
                {profile.name ? profile.name.split(" ").map((n) => n[0]).join("") : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold">{profile.name || "Anonymous"}</h1>
                {profile.available && (
                  <Badge variant="outline" className="border-success text-success">
                    <CheckCircle className="mr-1 h-3 w-3" /> Available
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">{profile.bio || "No bio yet"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {profile.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {profile.location}</span>}
                <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {profile.email}</span>
              </div>
              <div className="mt-3 flex gap-2">
                {profile.github && (
                  <a href={profile.github} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Github className="mr-1 h-4 w-4" /> GitHub</Button>
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Linkedin className="mr-1 h-4 w-4" /> LinkedIn</Button>
                  </a>
                )}
                {profile.portfolio && (
                  <a href={profile.portfolio} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Globe className="mr-1 h-4 w-4" /> Portfolio</Button>
                  </a>
                )}
              </div>
            </div>
            <Link to="/edit-profile">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </div>
        </div>

        {profile.skills.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => <Badge key={s} variant="secondary" className="px-3 py-1">{s}</Badge>)}
            </div>
          </div>
        )}

        {profile.interests.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold">Interested Domains</h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((i) => <Badge key={i} variant="outline" className="px-3 py-1">{i}</Badge>)}
            </div>
          </div>
        )}

        {joinedEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 font-display text-xl font-semibold">Events Joined</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {joinedEvents.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}

        {createdEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 font-display text-xl font-semibold">Events Created</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {createdEvents.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
