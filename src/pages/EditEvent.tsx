import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    domain: "",
    mode: "online",
    team_size: 4,
    deadline: "",
  });

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            title: data.title || "",
            description: data.description || "",
            location: data.location || "",
            domain: data.domain || "",
            mode: data.mode || "online",
            team_size: data.team_size || 4,
            deadline: data.deadline ? data.deadline.split("T")[0] : "",
          });
        }
        setFetching(false);
      });
  }, [id]);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("events")
      .update({
        title: form.title,
        description: form.description,
        location: form.location,
        domain: form.domain,
        mode: form.mode,
        team_size: form.team_size,
        deadline: form.deadline,
      })
      .eq("id", id);

    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to update event");
    } else {
      toast.success("Event updated successfully!");
      navigate("/dashboard");
    }
  };

  // ✅ Delete event from Supabase and redirect to dashboard
  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete related records first to avoid FK constraint errors
      await supabase.from("event_requests").delete().eq("event_id", id);

      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      toast.success("Event deleted successfully.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete event");
      setDeleting(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg py-10">
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Event</h1>
        {/* ✅ Delete button */}
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete Event
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">
            Title
          </label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted-foreground">
            Description
          </label>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={4}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted-foreground">
            Domain
          </label>
          <Input
            value={form.domain}
            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted-foreground">
            Location
          </label>
          <Input
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted-foreground">
            Mode
          </label>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none"
            value={form.mode}
            onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted-foreground">
            Team Size
          </label>
          <Input
            type="number"
            value={form.team_size}
            onChange={(e) =>
              setForm((f) => ({ ...f, team_size: Number(e.target.value) }))
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted-foreground">
            Deadline
          </label>
          <Input
            type="date"
            value={form.deadline}
            onChange={(e) =>
              setForm((f) => ({ ...f, deadline: e.target.value }))
            }
          />
        </div>

        <Button
          className="gradient-bg text-primary-foreground"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* ✅ Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Delete Event?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                "{form.title}"
              </span>
              ? This will also delete all join requests for this event. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditEvent;
