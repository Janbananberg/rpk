import { Outlet, useLocation, useNavigate } from "react-router";
import { Trophy, Ticket, Shield, Gamepad2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getAdminToken } from "./api";
import { RpkLogo } from "./rpk-logo";
import { NavigationGuardProvider, useNavigationGuard } from "./navigation-guard";
import { ConfirmDialog } from "./confirm-dialog";

const FONT = "'Titillium Web', sans-serif";

type TabKey = "turnering" | "bet" | "highscore" | "admin";

const ALL_TABS: { key: TabKey; path: string; label: string; icon: typeof Trophy; adminOnly?: boolean; mobileVisible?: boolean }[] = [
  { key: "highscore", path: "/", label: "Spela", icon: Gamepad2, mobileVisible: true },
  { key: "turnering", path: "/turnering", label: "Turnering", icon: Trophy },
  { key: "bet", path: "/bet", label: "Betting", icon: Ticket, adminOnly: true },
  { key: "admin", path: "/admin", label: "Admin", icon: Shield },
];

function getActiveTab(pathname: string): TabKey {
  if (pathname.startsWith("/turnering")) return "turnering";
  if (pathname.startsWith("/bet")) return "bet";
  if (pathname.startsWith("/admin")) return "admin";
  return "highscore";
}

export function RootLayout() {
  return (
    <NavigationGuardProvider>
      <RootLayoutInner />
    </NavigationGuardProvider>
  );
}

function RootLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [isAdmin, setIsAdmin] = useState(() => !!getAdminToken());
  const { isBlocked, pendingPath, setPendingPath } = useNavigationGuard();

  // Re-check admin token periodically and on navigation
  useEffect(() => {
    setIsAdmin(!!getAdminToken());
  }, [location.pathname]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAdmin(!!getAdminToken());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const TABS = ALL_TABS.filter((t) => !t.adminOnly || isAdmin);
  const MOBILE_TABS = TABS.filter((t) => t.mobileVisible);

  const handleNavigate = (path: string) => {
    if (isBlocked()) {
      setPendingPath(path);
      return;
    }
    navigate(path);
  };

  const confirmNavigation = () => {
    const path = pendingPath;
    setPendingPath(null);
    if (path === "__back__") {
      window.history.back();
    } else if (path) {
      navigate(path);
    }
  };

  const cancelNavigation = () => {
    setPendingPath(null);
  };

  // Browser back / beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isBlocked()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isBlocked]);

  // Handle browser popstate (back button)
  useEffect(() => {
    const handler = () => {
      if (isBlocked()) {
        // Push the current path back to prevent actual navigation
        window.history.pushState(null, "", location.pathname);
        setPendingPath("__back__");
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [isBlocked, location.pathname, setPendingPath]);

  return (
    <div className="h-dvh bg-background text-foreground flex flex-col overflow-hidden">
      {/* Navigation guard confirm dialog */}
      <ConfirmDialog
        open={pendingPath !== null}
        title="Lämna pågående omgång?"
        message="Du har en omgång igång som inte sparats. Om du navigerar bort kommer dina osparade ändringar att försvinna."
        confirmLabel="Lämna"
        cancelLabel="Stanna kvar"
        variant="warning"
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />

      {/* Top navigation bar — desktop only shows tabs, mobile shows title only */}
      <header
        className="shrink-0 z-50 border-b border-border"
        style={{ background: "var(--surface-container)" }}
      >
        <div className="max-w-4xl mx-auto px-4">
          {/* Title row */}
          <div className="flex items-center justify-center h-12 gap-2.5">
            <RpkLogo
              className="h-7 w-auto shrink-0"
              style={{ aspectRatio: "786 / 690" }}
            />
            <span
              className="text-foreground tracking-widest uppercase"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "0.2em",
              }}
            >
              Rundpingisklubben
            </span>
          </div>

          {/* Desktop tab bar — hidden on mobile */}
          <div className="hidden md:flex gap-0">
            {TABS.map(({ key, path, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => handleNavigate(path)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-label)",
                    fontWeight: isActive
                      ? "var(--font-weight-semibold)"
                      : "var(--font-weight-normal)",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Page content — scrollable area, bottom padding on mobile for bottom nav */}
      <main
        className="flex-1 min-h-0 overflow-y-auto mobile-nav-padding overscroll-y-contain"
        id="main-scroll-area"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <Outlet />
      </main>

      {/* Bottom navigation bar — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border"
        style={{
          background: "var(--surface-container)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex">
          {MOBILE_TABS.map(({ key, path, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => handleNavigate(path)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-xs)",
                  fontWeight: isActive
                    ? "var(--font-weight-semibold)"
                    : "var(--font-weight-normal)",
                  minHeight: 56,
                }}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span>{label}</span>
                {isActive && (
                  <div
                    className="absolute top-0 w-12 h-[3px] rounded-b-full"
                    style={{ background: "var(--primary)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}