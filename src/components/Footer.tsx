import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
              <Zap className="h-5 w-5 text-primary" />
              Eventra
            </div>
            <p className="text-sm text-muted-foreground">
              Discover events, find teammates, and build something amazing together.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-display font-semibold">Platform</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/explore" className="hover:text-primary transition-colors">Explore Events</Link>
              <Link to="/create-event" className="hover:text-primary transition-colors">Create Event</Link>
              <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-display font-semibold">Company</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-primary transition-colors">About</Link>
              <span className="cursor-default">Careers</span>
              <span className="cursor-default">Blog</span>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-display font-semibold">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="cursor-default">Privacy Policy</span>
              <span className="cursor-default">Terms of Service</span>
              <span className="cursor-default">Contact</span>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Eventra. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
