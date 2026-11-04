import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./components/root-layout";

// Each page is its own chunk, so the first visit only loads the page it lands on.
export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, lazy: async () => ({ Component: (await import("./components/highscore-page")).HighscorePage }) },
      { path: "turnering", lazy: async () => ({ Component: (await import("./components/tournament-page")).TournamentPage }) },
      { path: "admin", lazy: async () => ({ Component: (await import("./components/admin-page")).AdminPage }) },
      // Office TV view. Not in the nav; it covers the whole layout itself.
      { path: "storbild", lazy: async () => ({ Component: (await import("./components/big-screen-page")).BigScreenPage }) },
      { path: "highscore", element: <Navigate to="/" replace /> },
      // Removed pages (e.g. /forslag) and typos land on the start page instead of an error.
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
