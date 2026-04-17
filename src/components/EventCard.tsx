import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, MapPin } from "lucide-react";
import type { Event } from "@/lib/mock-data";

const EventCard = ({ event }: { event: Event }) => {
  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
      {/* Event Image */}
      <div className="h-40 w-full overflow-hidden bg-muted">
        {event.image ? (
          <img src={event.image} alt={event.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center gradient-bg opacity-20">
            <span className="text-4xl font-bold text-primary-foreground/50">{event.title.charAt(0)}</span>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <Badge variant="secondary" className="font-medium">
            {event.domain}
          </Badge>
          <Badge variant={event.mode === "online" ? "default" : "outline"} className={event.mode === "online" ? "gradient-bg border-0" : ""}>
            <MapPin className="mr-1 h-3 w-3" />
            {event.mode === "online" ? "Online" : "Offline"}
          </Badge>
        </div>

        <h3 className="mb-2 font-display text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
          {event.title}
        </h3>

        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {event.description}
        </p>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {event.skillsRequired.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
          {event.skillsRequired.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{event.skillsRequired.length - 3}
            </Badge>
          )}
        </div>

        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {event.participantsJoined}/{event.teamSize}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(event.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>

        <Link to={`/event/${event.id}`}>
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
