import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Camera } from "lucide-react";
import { toast } from "sonner";
import { allSkills, domains } from "@/lib/mock-data";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  bio: z.string().trim().max(500).optional(),
  location: z.string().trim().max(200).optional(),
  github: z.string().trim().url("Invalid URL").or(z.literal("")).optional(),
  linkedin: z.string().trim().url("Invalid URL").or(z.literal("")).optional(),
  portfolio: z.string().trim().url("Invalid URL").or(z.literal("")).optional(),
});

const EditProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [available, setAvailable] = useState(true);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio);
      setLocation(profile.location);
      setSkills(profile.skills);
      setInterests(profile.interests);
      setGithub(profile.github);
      setLinkedin(profile.linkedin);
      setPortfolio(profile.portfolio);
      setAvailable(profile.available);
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(newUrl);
      // Update profile immediately
      await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id);
      toast.success("Profile picture updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => setSkills(skills.filter((s) => s !== skill));

  const toggleInterest = (domain: string) => {
    setInterests((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = profileSchema.safeParse({ name, bio, location, github, linkedin, portfolio });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          bio,
          location,
          skills,
          interests,
          github,
          linkedin,
          portfolio,
          available,
          avatar_url: avatarUrl || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated!");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-display text-3xl font-bold">Edit Profile</h1>
        <p className="mb-8 text-muted-foreground">Update your profile to get better event recommendations</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="gradient-bg text-2xl font-bold text-primary-foreground">
                  {name ? name.split(" ").map((n) => n[0]).join("") : "?"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full gradient-bg text-primary-foreground shadow-md transition-transform hover:scale-110">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </label>
            </div>
            {uploadingAvatar && <p className="text-xs text-muted-foreground">Uploading...</p>}
            <p className="text-sm text-muted-foreground">Click the camera icon to update your profile picture</p>
          </div>

          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." maxLength={500} rows={3} />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, CA" maxLength={200} />
          </div>

          <div>
            <Label>Skills</Label>
            <div className="mb-2 flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 px-3 py-1">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Type a skill and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => addSkill(skillInput)}>
                Add
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allSkills
                .filter((s) => !skills.includes(s))
                .slice(0, 12)
                .map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="cursor-pointer text-xs hover:bg-secondary"
                    onClick={() => addSkill(s)}
                  >
                    + {s}
                  </Badge>
                ))}
            </div>
          </div>

          <div>
            <Label>Domains of Interest</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {domains.map((d) => (
                <Badge
                  key={d}
                  variant={interests.includes(d) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${interests.includes(d) ? "gradient-bg border-0 text-primary-foreground" : "hover:bg-secondary"}`}
                  onClick={() => toggleInterest(d)}
                >
                  {d}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="github">GitHub URL</Label>
              <Input id="github" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div>
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <Label htmlFor="portfolio">Portfolio URL</Label>
              <Input id="portfolio" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://yoursite.com" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Available for teams</p>
              <p className="text-sm text-muted-foreground">Let others know you're open to collaborating</p>
            </div>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1 gradient-bg text-primary-foreground" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/profile")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
