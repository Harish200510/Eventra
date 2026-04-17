import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Users, Zap, Target, Heart } from "lucide-react";

const values = [
  { icon: Users, title: "Community First", desc: "We believe great things happen when the right people come together." },
  { icon: Target, title: "Skill Matching", desc: "Our platform helps you find teammates whose skills complement yours." },
  { icon: Heart, title: "Passion Driven", desc: "Built by builders, for builders who want to make an impact." },
  { icon: Zap, title: "Move Fast", desc: "From discovery to team formation in minutes, not days." },
];

const About = () => {
  return (
    <div className="min-h-screen">
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-4xl font-bold md:text-5xl">
              About <span className="gradient-text">Eventra</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Eventra is a collaboration platform where students and professionals discover hackathons, competitions, and projects — and find the perfect teammates to build with.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-display text-3xl font-bold">Our Values</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="rounded-lg border border-border bg-card p-6 text-center shadow-card">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-bg">
                  <v.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
