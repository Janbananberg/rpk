import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./components/root-layout";
import { TournamentPage } from "./components/tournament-page";
import { BettingPage } from "./components/betting-page";
import { AdminPage } from "./components/admin-page";
import { HighscorePage } from "./components/highscore-page";
import { SuggestionsPage } from "./components/suggestions-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HighscorePage },
      { path: "turnering", Component: TournamentPage },
      { path: "bet", Component: BettingPage },
      { path: "forslag", Component: SuggestionsPage },
      { path: "admin", Component: AdminPage },
      { path: "highscore", element: <Navigate to="/" replace /> },
    ],
  },
]);