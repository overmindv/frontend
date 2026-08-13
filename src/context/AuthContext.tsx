import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  TOKEN_STORAGE_KEY,
  USER_ID_STORAGE_KEY,
  apolloClient,
  clearStoredAuth,
  setUnauthenticatedHandler,
} from "../api/client";
import type { AuthPayload } from "../api/types";

interface AuthContextValue {
  token: string | null;
  userId: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  signIn: (payload: AuthPayload) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredValue(key: string) {
  return localStorage.getItem(key);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => readStoredValue(TOKEN_STORAGE_KEY));
  const [userId, setUserId] = useState(() => readStoredValue(USER_ID_STORAGE_KEY));

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUserId(null);
    void apolloClient.clearStore();
    navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => setUnauthenticatedHandler(logout), [logout]);

  useEffect(() => {
    if ((token && !userId) || (!token && userId)) {
      logout();
    }
  }, [logout, token, userId]);

  const signIn = useCallback((payload: AuthPayload) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
    localStorage.setItem(USER_ID_STORAGE_KEY, payload.user.id);
    setToken(payload.token);
    setUserId(payload.user.id);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      userId,
      isAdmin: isAdminToken(token),
      isAuthenticated: Boolean(token && userId),
      signIn,
      logout,
    }),
    [logout, signIn, token, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isAdminToken(token: string | null) {
  if (!token) {
    return false;
  }

  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = JSON.parse(window.atob(padded)) as { roles?: string[] };

    return decoded.roles?.some((role) => ["admin", "superuser"].includes(role.toLowerCase())) ?? false;
  } catch {
    return false;
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
