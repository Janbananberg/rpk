import { createContext, useContext, useCallback, useRef, useState } from "react";

type GuardCallback = () => boolean; // returns true if navigation should be blocked

interface NavigationGuardContextValue {
  /** Register a guard. Returns an unregister function. */
  registerGuard: (guard: GuardCallback) => () => void;
  /** Check all guards. Returns true if ANY guard blocks. */
  isBlocked: () => boolean;
  /** Pending navigation path (set when blocked) */
  pendingPath: string | null;
  setPendingPath: (path: string | null) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue>({
  registerGuard: () => () => {},
  isBlocked: () => false,
  pendingPath: null,
  setPendingPath: () => {},
});

export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}

export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const guardsRef = useRef<Set<GuardCallback>>(new Set());
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const registerGuard = useCallback((guard: GuardCallback) => {
    guardsRef.current.add(guard);
    return () => {
      guardsRef.current.delete(guard);
    };
  }, []);

  const isBlocked = useCallback(() => {
    for (const guard of guardsRef.current) {
      if (guard()) return true;
    }
    return false;
  }, []);

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, isBlocked, pendingPath, setPendingPath }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}
