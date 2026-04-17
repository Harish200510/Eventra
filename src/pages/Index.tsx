import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { domains } from "@/lib/mock-data";
import EventCard from "@/components/EventCard";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Search, Users, Rocket, ArrowRight, Sparkles, Globe, Trophy, Calendar, Code, Shield, Gamepad2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Event } from "@/lib/mock-data";

const steps = [
  { icon: Search, title: "Discover Events", desc: "Browse hackathons, competitions, and projects across every domain." },
  { icon: Users, title: "Find Teammates", desc: "Connect with skilled people who share your interests and goals." },
  { icon: Rocket, title: "Build & Win", desc: "Collaborate, create something amazing, and showcase your work." },
];

const categoryIcons: Record<string, typeof Globe> = {
  "Web Development": Code,
  "AI / ML": Sparkles,
  "App Development": Rocket,
  "Startup / Entrepreneurship": Trophy,
  "Cybersecurity": Shield,
  "Game Development": Gamepad2,
  "IoT": Globe,
  "FinTech": Trophy,
  "Healthcare": Calendar,
  "Open Source": Code,
  "Sustainability": Globe,
  "EdTech": Users,
};

const mapEvent = (e: any): Event => ({
  id: e.id, title: e.title, description: e.description,
  organizerId: e.organizer_id, organizerName: e.organizer_name,
  skillsRequired: e.skills_required || [], teamSize: e.team_size,
  participantsJoined: e.participants_joined, deadline: e.deadline || "",
  domain: e.domain, mode: e.mode as "online" | "offline",
  location: e.location || undefined,
});

const Index = () => {
  const { data: featured = [] } = useQuery({
    queryKey: ["featured-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false }).limit(3);
      return (data || []).map(mapEvent);
    },
  });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(243_75%_59%/0.08),transparent_60%)]" />
        <div className="container relative mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              The platform for builders
            </Badge>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Find Events.{" "}
              <span className="gradient-text">Build Your Dream Team.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Discover hackathons, competitions, and projects — and collaborate with talented teammates.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/explore">
                <Button size="lg" className="gradient-bg text-primary-foreground px-8">
                  Explore Events <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/create-event">
                <Button size="lg" variant="outline" className="px-8">Create Event</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Events */}
      {featured.length > 0 && (
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Featured Events</h2>
              <p className="mt-3 text-muted-foreground">Join the most exciting events happening right now</p>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((event, i) => (
                <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link to="/explore">
                <Button variant="outline" size="lg">View All Events <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">How Eventra Works</h2>
            <p className="mt-3 text-muted-foreground">Three simple steps to get started</p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div key={step.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="relative rounded-lg border border-border bg-card p-8 text-center shadow-card">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl gradient-bg">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="absolute -top-3 left-6 flex h-6 w-6 items-center justify-center rounded-full gradient-bg text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Popular Categories</h2>
            <p className="mt-3 text-muted-foreground">Find events in your area of interest</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {domains.slice(0, 6).map((domain, i) => {
              const Icon = categoryIcons[domain] || Globe;
              return (
                <motion.div key={domain} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/explore?domain=${encodeURIComponent(domain)}`}
                    className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1">
                    <Icon className="h-8 w-8 text-primary" />
                    <span className="text-center text-sm font-medium">{domain}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-2xl gradient-bg p-12 text-center md:p-16">
            <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              Ready to build something amazing?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Join thousands of builders discovering events and forming dream teams on Eventra.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/signup">
                <Button size="lg" variant="secondary" className="px-8">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
