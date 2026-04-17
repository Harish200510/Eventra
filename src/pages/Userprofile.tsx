import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Github,
  Linkedin,
  Globe,
  Mail,
  Briefcase,
  Star,
} from "lucide-react";

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen max-w-2xl px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Profile Card */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        {/* Cover gradient */}
        <div className="h-28 w-full gradient-bg opacity-80" />

        {/* Avatar + Name */}
        <div className="px-6 pb-6">
          <div className="-mt-12 mb-4 flex items-end justify-between">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="gradient-bg text-3xl font-bold text-primary-foreground">
                {(profile.name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {profile.available && (
              <Badge className="gradient-bg border-0 text-primary-foreground">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-green-300 inline-block" />
                Open to Team Up
              </Badge>
            )}
          </div>

          {/* Name + Email */}
          <h1 className="font-display text-2xl font-bold text-foreground">
            {profile.name || "Unknown User"}
          </h1>
          {profile.email && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {profile.email}
            </p>
          )}

          {/* Location */}
          {profile.location && profile.location !== "EMPTY" && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {profile.location}
            </p>
          )}

          {/* Bio */}
          {profile.bio && profile.bio !== "EMPTY" && (
            <div className="mt-4 rounded-lg bg-muted/40 p-4">
              <p className="text-sm leading-relaxed text-foreground">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Skills */}
          {profile.skills && (profile.skills as string[]).length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Star className="h-4 w-4 text-primary" /> Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {(profile.skills as string[]).map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="text-xs px-3 py-1"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Interests */}
          {profile.interests && (profile.interests as string[]).length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Briefcase className="h-4 w-4 text-primary" /> Interests
              </h2>
              <div className="flex flex-wrap gap-2">
                {(profile.interests as string[]).map((interest) => (
                  <Badge
                    key={interest}
                    variant="outline"
                    className="text-xs px-3 py-1"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {(profile.github || profile.linkedin || profile.portfolio) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {profile.github && (
                <a
                  href={
                    profile.github.startsWith("http")
                      ? profile.github
                      : `https://github.com/${profile.github}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <Github className="h-4 w-4" /> GitHub
                  </Button>
                </a>
              )}
              {profile.linkedin && (
                <a
                  href={
                    profile.linkedin.startsWith("http")
                      ? profile.linkedin
                      : `https://linkedin.com/in/${profile.linkedin}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </Button>
                </a>
              )}
              {profile.portfolio && (
                <a
                  href={
                    profile.portfolio.startsWith("http")
                      ? profile.portfolio
                      : `https://${profile.portfolio}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" /> Portfolio
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
