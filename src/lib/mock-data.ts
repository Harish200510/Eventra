export interface Event {
  id: string;
  title: string;
  description: string;
  organizerId: string;
  organizerName: string;
  skillsRequired: string[];
  teamSize: number;
  participantsJoined: number;
  deadline: string;
  domain: string;
  mode: "online" | "offline";
  location?: string;
  image?: string;
}

export interface User {
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
  avatar: string;
  available: boolean;
  eventsJoined: string[];
  eventsCreated: string[];
}

export const mockEvents: Event[] = [];

export const domains = [
  "Web Development",
  "AI / ML",
  "App Development",
  "Startup / Entrepreneurship",
  "Cybersecurity",
  "Game Development",
  "IoT",
  "FinTech",
  "Healthcare",
  "Open Source",
  "Sustainability",
  "EdTech",
];

export const allSkills = [
  "React", "Node.js", "Python", "Machine Learning", "UI/UX",
  "Java", "C++", "Data Science", "TypeScript", "TensorFlow",
  "IoT", "Data Analysis", "Blockchain", "D3.js", "Git",
  "Rust", "Go", "Arduino", "Cloud Computing", "Finance",
  "Flutter", "Swift", "Kotlin", "Docker", "AWS",
];

export const mockUser: User = {
  id: "u1",
  name: "Alex Johnson",
  email: "alex@example.com",
  bio: "",
  location: "",
  skills: [],
  interests: [],
  github: "",
  linkedin: "",
  portfolio: "",
  avatar: "",
  available: true,
  eventsJoined: [],
  eventsCreated: [],
};
