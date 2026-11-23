import { Link } from "@tanstack/react-router";
import { CirclePlay, Images, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectedNavigation({ active }: { active: "chats" | "status" | "post" }) {
  return <nav aria-label="Secciones de Connected" className="grid shrink-0 grid-cols-3 gap-1 border-y px-2 py-2">
    <Button asChild variant={active === "chats" ? "secondary" : "ghost"} className="min-w-0 px-1"><Link to="/chats" aria-current={active === "chats" ? "page" : undefined}><MessageCircle />Chats</Link></Button>
    <Button asChild variant={active === "status" ? "secondary" : "ghost"} className="min-w-0 px-1"><Link to="/statuses" aria-current={active === "status" ? "page" : undefined}><CirclePlay />Estados</Link></Button>
    <Button asChild variant={active === "post" ? "secondary" : "ghost"} className="min-w-0 px-1"><Link to="/posts" aria-current={active === "post" ? "page" : undefined}><Images />Posts</Link></Button>
  </nav>;
}