import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./theme";

export default function App() {
  useEffect(() => {
    document.documentElement.setAttribute("data-palette", "lkab-default-palette");
    document.documentElement.setAttribute("data-theme", "lkab-dark");
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
