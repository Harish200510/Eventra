import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { domains } from "@/lib/mock-data";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, X, Lock } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

const ExploreEvents = () => {
  const { user, profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState(
    searchParams.get("domain") || "",
  );
  const [selectedMode, setSelectedMode] = useState("");
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const { data: dbEvents = [], isLoading } = useQuery({
    queryKey: ["events"],
    // ✅ No auth needed — fetch all events publicly
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*");
      if (error) throw error;
      return (data || []).map(mapEvent);
    },
  });

  const clearFilters = () => {
    setSearch("");
    setSelectedDomain("");
    setSelectedMode("");
  };

  const hasFilters = search || selectedDomain || selectedMode;
  const userSkills = profile?.skills || [];

  const scored = dbEvents
    // ✅ Hide own events only when logged in
    .filter((e) => !isAuthenticated || e.organizerId !== user?.id)
    .map((e) => {
      const skillMatch = e.skillsRequired.filter((s) =>
        userSkills.some((us) => us.toLowerCase() === s.toLowerCase()),
      ).length;
      return { ...e, score: skillMatch };
    });

  const filtered = scored
    .filter((e) => {
      if (
        search &&
        !e.title.toLowerCase().includes(search.toLowerCase()) &&
        !e.description.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (selectedDomain && e.domain !== selectedDomain) return false;
      if (selectedMode && e.mode !== selectedMode) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Explore Events</h1>
        <p className="mt-1 text-muted-foreground">
          Find the perfect event to join
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-8 space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Domain
          </h3>
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <Badge
                key={d}
                variant={selectedDomain === d ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedDomain === d
                    ? "gradient-bg border-0 text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
                onClick={() => setSelectedDomain(selectedDomain === d ? "" : d)}
              >
                {d}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Mode
          </h3>
          <div className="flex gap-2">
            {["online", "offline"].map((m) => (
              <Badge
                key={m}
                variant={selectedMode === m ? "default" : "outline"}
                className={`cursor-pointer capitalize transition-all ${
                  selectedMode === m
                    ? "gradient-bg border-0 text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
                onClick={() => setSelectedMode(selectedMode === m ? "" : m)}
              >
                {m}
              </Badge>
            ))}
          </div>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" /> Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          Loading events...
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <div key={e.id} className="relative">
                <EventCard event={e} />
                {/* ✅ Overlay blocks all clicks for unauthenticated users */}
                {!isAuthenticated && (
                  <div
                    className="absolute inset-0 cursor-pointer rounded-xl"
                    onClick={() => setLoginDialogOpen(true)}
                  />
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">
              No events match your filters.
            </p>
          )}
        </>
      )}

      {/* ✅ Login Required Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">
              Login to View Details
            </DialogTitle>
            <DialogDescription className="text-center">
              You need to be logged in to view event details and join teams.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              className="gradient-bg text-primary-foreground"
              onClick={() => {
                setLoginDialogOpen(false);
                navigate("/login?redirect=/explore");
              }}
            >
              Login
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setLoginDialogOpen(false);
                navigate("/signup?redirect=/explore");
              }}
            >
              Sign Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExploreEvents;
