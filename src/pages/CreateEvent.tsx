import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { domains } from "@/lib/mock-data";
import { toast } from "sonner";
import { z } from "zod";
import { ImagePlus, X, AlertTriangle, Users } from "lucide-react";

const createEventSchema = z
  .object({
    title: z.string().trim().min(1, "Event name is required").max(200),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000),
    domain: z.string().min(1, "Domain is required"),
    skills: z.string().trim().min(1, "Skills are required").max(500),
    teamSize: z.number().min(2, "Team size must be at least 2").max(50),
    deadline: z.string().min(1, "Deadline is required"),
    mode: z.enum(["online", "offline"]),
    location: z.string().trim().max(300).optional(),
  })
  .refine(
    (data) => {
      if (data.mode === "offline")
        return !!data.location && data.location.length > 0;
      return true;
    },
    {
      message: "Location is required for offline events",
      path: ["location"],
    },
  );

interface DuplicateEvent {
  id: string;
  title: string;
  organizerName: string;
  deadline: string;
  location?: string;
  mode: string;
  domain: string;
  isOwn: boolean; // true = posted by current user
}

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("");
  const [skills, setSkills] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [deadline, setDeadline] = useState("");
  const [mode, setMode] = useState<"online" | "offline">("online");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Duplicate detection
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateEvents, setDuplicateEvents] = useState<DuplicateEvent[]>([]);
  const [ownDuplicate, setOwnDuplicate] = useState<DuplicateEvent | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md text-center">
          <h2 className="mb-2 font-display text-2xl font-bold">
            Login Required
          </h2>
          <p className="mb-6 text-muted-foreground">
            Please login or signup to create an event.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              className="gradient-bg text-primary-foreground"
              onClick={() => navigate("/login?redirect=/create-event")}
            >
              Login
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/signup?redirect=/create-event")}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const checkForDuplicates = async (
    eventTitle: string,
  ): Promise<DuplicateEvent[]> => {
    const { data } = await supabase
      .from("events")
      .select(
        "id, title, organizer_id, organizer_name, deadline, location, mode, domain",
      )
      .ilike("title", eventTitle.trim());

    return (data || []).map((e) => ({
      id: e.id,
      title: e.title,
      organizerName: e.organizer_name,
      deadline: e.deadline,
      location: e.location,
      mode: e.mode,
      domain: e.domain,
      isOwn: e.organizer_id === user!.id,
    }));
  };

  const doCreateEvent = async () => {
    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const filePath = `${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("events").insert({
        title,
        description,
        domain,
        skills_required: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        team_size: parseInt(teamSize),
        deadline: new Date(deadline).toISOString(),
        mode,
        location: mode === "offline" ? location : null,
        organizer_id: user!.id,
        organizer_name: profile?.name || "Anonymous",
        image_url: imageUrl,
      });
      if (error) throw error;
      toast.success("Event created successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = createEventSchema.safeParse({
      title,
      description,
      domain,
      skills,
      teamSize: parseInt(teamSize) || 0,
      deadline,
      mode,
      location: location || undefined,
    });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setLoading(true);
    const duplicates = await checkForDuplicates(title);
    setLoading(false);

    if (duplicates.length > 0) {
      const own = duplicates.find((d) => d.isOwn) || null;
      const others = duplicates.filter((d) => !d.isOwn);
      setOwnDuplicate(own);
      setDuplicateEvents(others);
      setDuplicateDialogOpen(true);
      return;
    }

    await doCreateEvent();
  };

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-display text-3xl font-bold">Create Event</h1>
        <p className="mb-8 text-muted-foreground">
          Set up your event and start finding teammates
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Event Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AI Innovation Hackathon"
              maxLength={200}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your event..."
              maxLength={2000}
              rows={5}
              required
            />
          </div>

          {/* Event Image Upload */}
          <div>
            <Label>Event Image (Optional)</Label>
            {imagePreview ? (
              <div className="relative mt-2 overflow-hidden rounded-lg border border-border">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-48 w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-muted/50">
                <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload an image
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG up to 5MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mode</Label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as "online" | "offline")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === "offline" && (
            <div>
              <Label htmlFor="location">
                Location (City / Venue / Address)
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco Convention Center, CA"
                maxLength={300}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="skills">Skills Required</Label>
            <Input
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="React, Python, Machine Learning (comma separated)"
              maxLength={500}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="teamSize">Team Size</Label>
              <Input
                id="teamSize"
                type="number"
                min={2}
                max={50}
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                placeholder="4"
                required
              />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full gradient-bg text-primary-foreground"
            disabled={loading}
          >
            {loading ? "Checking..." : "Create Event"}
          </Button>
        </form>
      </div>

      {/* Duplicate Event Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {ownDuplicate
                ? "You Already Posted This Event"
                : "Similar Event Already Exists"}
            </DialogTitle>
            <DialogDescription>
              {ownDuplicate
                ? `You have already created an event called "${ownDuplicate.title}". You cannot post duplicate events.`
                : `We found ${duplicateEvents.length === 1 ? "an event" : "events"} with the same name posted by other organizers.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 max-h-72 overflow-y-auto">
            {/* Show own duplicate first with a strong warning */}
            {ownDuplicate && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">
                  ⚠️ Your existing event
                </p>
                <p className="mt-1 text-sm font-medium">{ownDuplicate.title}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-amber-700">
                  {ownDuplicate.deadline && (
                    <span>
                      📅 {new Date(ownDuplicate.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <span className="capitalize">🌐 {ownDuplicate.mode}</span>
                  {ownDuplicate.location && (
                    <span>📍 {ownDuplicate.location}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-amber-400 text-amber-700 hover:bg-amber-100"
                  onClick={() => {
                    setDuplicateDialogOpen(false);
                    navigate(`/event/${ownDuplicate.id}`);
                  }}
                >
                  View My Event
                </Button>
              </div>
            )}

            {/* Other organizers' duplicates */}
            {duplicateEvents.map((dup) => (
              <div
                key={dup.id}
                className="rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{dup.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Organized by{" "}
                      <span className="font-medium text-foreground">
                        {dup.organizerName}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {dup.deadline && (
                        <span>
                          📅 {new Date(dup.deadline).toLocaleDateString()}
                        </span>
                      )}
                      <span className="capitalize">🌐 {dup.mode}</span>
                      {dup.location && <span>📍 {dup.location}</span>}
                      {dup.domain && <span>🏷️ {dup.domain}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gradient-bg text-primary-foreground"
                    onClick={() => {
                      setDuplicateDialogOpen(false);
                      // ✅ Correct route: /event/:id
                      navigate(`/event/${dup.id}`);
                    }}
                  >
                    <Users className="mr-1 h-3.5 w-3.5" />
                    Join
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            {/* Only show "Create My Own" if there's no own duplicate */}
            {!ownDuplicate && (
              <>
                <p className="text-xs text-muted-foreground text-center">
                  Or proceed to create your own separate team for this event
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDuplicateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-primary/30 text-primary hover:bg-primary/5"
                    disabled={loading}
                    onClick={async () => {
                      setDuplicateDialogOpen(false);
                      await doCreateEvent();
                    }}
                  >
                    {loading ? "Creating..." : "Create My Own Team"}
                  </Button>
                </div>
              </>
            )}

            {/* If own duplicate, only show Close */}
            {ownDuplicate && (
              <Button
                variant="outline"
                onClick={() => setDuplicateDialogOpen(false)}
              >
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateEvent;
