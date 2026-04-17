import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap, Inbox } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-requests-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("event_requests")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      setLoginPromptOpen(true);
      return;
    }
    navigate("/create-event");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-bold text-foreground"
          >
            <Zap className="h-6 w-6 text-primary" />
            Eventra
          </Link>

          {/* Desktop */}
          <div className="hidden items-center gap-1 md:flex">
            <Link to="/explore">
              <Button variant="ghost" size="sm">
                Explore Events
              </Button>
            </Link>
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCreateClick}>
                  Create Event
                </Button>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <Link to="/requests">
                  <Button variant="ghost" size="sm" className="relative">
                    <Inbox className="mr-1 h-4 w-4" /> Requests
                    {pendingCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full gradient-bg text-[10px] font-bold text-primary-foreground">
                        {pendingCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    Profile
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleCreateClick}>
                  Create Event
                </Button>
                <Link to="/about">
                  <Button variant="ghost" size="sm">
                    About
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button
                    size="sm"
                    className="gradient-bg text-primary-foreground"
                  >
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
            {/* ✅ Theme toggle — last item in desktop nav */}
            <ThemeToggle />
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-border bg-background p-4 md:hidden">
            <div className="flex flex-col gap-2">
              <Link to="/explore" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Explore Events
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  handleCreateClick();
                  setMobileOpen(false);
                }}
              >
                Create Event
              </Button>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Dashboard
                    </Button>
                  </Link>
                  <Link to="/requests" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Requests
                      {pendingCount > 0 && (
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full gradient-bg text-[10px] font-bold text-primary-foreground">
                          {pendingCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/about" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      About
                    </Button>
                  </Link>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full gradient-bg text-primary-foreground">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Login Prompt for Create Event */}
      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              Please login or signup to create an event.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 gradient-bg text-primary-foreground"
              onClick={() => {
                setLoginPromptOpen(false);
                navigate("/login?redirect=/create-event");
              }}
            >
              Login
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setLoginPromptOpen(false);
                navigate("/signup?redirect=/create-event");
              }}
            >
              Sign Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;
 