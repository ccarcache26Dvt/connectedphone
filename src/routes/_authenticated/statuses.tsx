import { createFileRoute } from "@tanstack/react-router";
import { SocialFeed } from "@/components/social-feed";
import { socialFeedOptions } from "@/lib/social-data";

export const Route = createFileRoute("/_authenticated/statuses")({
  head: () => ({ meta: [
    { title: "Estados — Connected" },
    { name: "description", content: "Fotos y videos de tus contactos en estados que duran 24 horas." },
    { property: "og:title", content: "Estados — Connected" },
    { property: "og:description", content: "Comparte fotos, videos y dedicatorias por 24 horas con tus contactos de Connected." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(socialFeedOptions(context.user.id, "status")),
  component: StatusesPage,
});

function StatusesPage() {
  const { user } = Route.useRouteContext();
  return <SocialFeed me={user.id} kind="status" />;
}