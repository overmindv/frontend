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
      isAuthenticated: Boolean(token && userId),
      signIn,
      logout,
    }),
    [logout, signIn, token, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
