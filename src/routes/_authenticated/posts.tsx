import { createFileRoute } from "@tanstack/react-router";
import { SocialFeed } from "@/components/social-feed";
import { socialFeedOptions } from "@/lib/social-data";

export const Route = createFileRoute("/_authenticated/posts")({
  head: () => ({ meta: [
    { title: "Publicaciones — Connected" },
    { name: "description", content: "Publicaciones permanentes con fotos, videos, dedicatorias y menciones a tus contactos." },
    { property: "og:title", content: "Publicaciones — Connected" },
    { property: "og:description", content: "Conserva tus momentos y dedica publicaciones a tus contactos por nombre en Connected." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(socialFeedOptions(context.user.id, "post")),
  component: PostsPage,
});

function PostsPage() {
  const { user } = Route.useRouteContext();
  return <SocialFeed me={user.id} kind="post" />;
}