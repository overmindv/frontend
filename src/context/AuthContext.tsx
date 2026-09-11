import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { apolloClient, setUnauthenticatedHandler } from "../api/client";
import { LOGOUT_MUTATION } from "../api/mutations";
import { ME_QUERY } from "../api/queries";
import type { AuthPayload } from "../api/types";

interface AuthUser {
  id: string;
  isAdmin: boolean;
  isSuperuser: boolean;
}

interface AuthContextValue {
  userId: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (payload: AuthPayload) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface MeData {
  me: AuthUser | null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const { data: meData, loading: meLoading } = useQuery<MeData>(ME_QUERY, {
    fetchPolicy: "network-only",
  });
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  // Восстанавливаем сессию по httpOnly cookie при загрузке страницы.
  useEffect(() => {
    const restored = meData?.me ?? null;
    setUser(
      restored
        ? { id: restored.id, isAdmin: restored.isAdmin, isSuperuser: restored.isSuperuser }
        : null,
    );
  }, [meData]);

  const logout = useCallback(() => {
    setUser(null);
    // Уведомляем сервер, чтобы он очистил httpOnly cookie.
    void logoutMutation().catch(() => undefined);
    void apolloClient.clearStore();
    navigate("/login", { replace: true });
  }, [logoutMutation, navigate]);

  useEffect(() => setUnauthenticatedHandler(logout), [logout]);

  const signIn = useCallback((payload: AuthPayload) => {
    // Токен уже в httpOnly cookie, выданной сервером; состояние строим из ответа мутации.
    setUser({
      id: payload.user.id,
      isAdmin: payload.user.isAdmin,
      isSuperuser: payload.user.isSuperuser,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      userId: user?.id ?? null,
      isAdmin: Boolean(user?.isAdmin || user?.isSuperuser),
      isAuthenticated: user != null,
      isLoading: user == null && meLoading,
      signIn,
      logout,
    }),
    [logout, meLoading, signIn, user],
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
