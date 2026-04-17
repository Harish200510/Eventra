import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  name: string;
  email: string;
  bio: string;
  location: string;
  skills: string[];
  interests: string[];
  github: string;
  linkedin: string;
  portfolio: string;
  avatar_url: string;
  available: boolean;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!data) {
      // create profile if it doesn't exist
      const { data: userData } = await supabase.auth.getUser();

      const user = userData?.user;

      if (user) {
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          name:
            user.user_metadata?.full_name || user.user_metadata?.name || "User",
          avatar_url: user.user_metadata?.avatar_url || "",
          skills: [],
          interests: [],
          bio: "",
          location: "",
          github: "",
          linkedin: "",
          portfolio: "",
          available: true,
        });

        // fetch again after insert
        return fetchProfile(userId);
      }
    }

    if (data) {
      setProfile({
        id: data.id,
        name: data.name || "",
        email: data.email || "",
        bio: data.bio || "",
        location: data.location || "",
        skills: data.skills || [],
        interests: data.interests || [],
        github: data.github || "",
        linkedin: data.linkedin || "",
        portfolio: data.portfolio || "",
        avatar_url: data.avatar_url || "",
        available: data.available ?? true,
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

 const loginWithGoogle = async () => {
   const { error } = await supabase.auth.signInWithOAuth({
     provider: "google",
     options: {
       redirectTo: window.location.origin + "/dashboard",
     },
   });

   if (error) throw error;
 };

  const signup = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAuthenticated: !!user, loading, login, loginWithGoogle, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
