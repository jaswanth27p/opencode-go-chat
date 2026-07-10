import Link from "next/link";
import { MessageSquare, Users, FlaskConical, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Chat",
    description: "Ask anything, attach images, audio or video, and switch models on the fly.",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Characters",
    description: "Chat with personas tuned for a specific role — code review, debugging, writing, and more.",
    href: "/characters",
    icon: Users,
  },
  {
    title: "Playground",
    description: "Test prompts, tweak temperature, max tokens and other model parameters.",
    href: "/playground",
    icon: FlaskConical,
  },
];

export function FeatureCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature) => (
        <Card key={feature.title} className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <feature.icon className="size-5 text-primary" />
              <CardTitle>{feature.title}</CardTitle>
            </div>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button render={<Link href={feature.href} />} nativeButton={false} className="gap-2">
              Open {feature.title}
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
