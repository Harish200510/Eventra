import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "@/components/EventCard";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Event } from "@/lib/mock-data";

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

const Dashboard = () => {
  const { user, profile } = useAuth();

  const { data: allEvents = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*");
      return (data || []).map(mapEvent);
    },
  });

  const { data: participantEventIds = [] } = useQuery({
    queryKey: ["my-participations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_participants")
        .select("event_id")
        .eq("user_id", user!.id);
      return (data || []).map((p) => p.event_id);
    },
  });

  const joinedEvents = allEvents.filter((e) =>
    participantEventIds.includes(e.id),
  );

  const createdEvents = allEvents.filter((e) => e.organizerId === user?.id);

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Welcome back{" "}
            <span className="gradient-text">
              {profile?.name?.split(" ")[0] || "there"}
            </span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's what's happening in your world
          </p>
        </div>

        <Link to="/create-event">
          <Button className="gradient-bg text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{joinedEvents.length}</p>
              <p className="text-sm text-muted-foreground">Events Joined</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg">
              <Plus className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{createdEvents.length}</p>
              <p className="text-sm text-muted-foreground">Events Created</p>
            </div>
          </div>
        </div>
      </div>

      {/* Joined Events */}
      {joinedEvents.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Badge variant="secondary">Joined</Badge>
            Events You've Joined
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {joinedEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* Created Events */}
      {createdEvents.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Badge variant="secondary">Created</Badge>
            Events You've Created
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {createdEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
