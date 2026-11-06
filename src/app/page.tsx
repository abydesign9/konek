import RaviionHomePage from "./landing/page";
import { StandaloneRedirect } from "@/components/StandaloneRedirect";

// Browser tab: show the marketing landing page. Installed app (standalone):
// StandaloneRedirect sends it straight to /home (which redirects to /login when
// signed out), so the app never shows the landing page.
export default function HomePage() {
  return (
    <>
      <StandaloneRedirect />
      <RaviionHomePage />
    </>
  );
}
