import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const [sessionRestored, setSessionRestored] = useState(false);
  const { data: meData, loading: meLoading } = useQuery<MeData>(ME_QUERY, {
    fetchPolicy: "network-only",
    context: { optionalSession: true },
  });
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  // Восстанавливаем сессию по httpOnly cookie при загрузке страницы.
  useEffect(() => {
    if (meLoading) return;
    const restored = meData?.me ?? null;
    setUser(
      restored
        ? { id: restored.id, isAdmin: restored.isAdmin, isSuperuser: restored.isSuperuser }
        : null,
    );
    // Guard ждёт применения пользователя, а не только завершения me-запроса.
    setSessionRestored(true);
  }, [meData, meLoading]);

  const logoutPending = useRef(false);
  const logout = useCallback(() => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    // Сначала удаляем cookie: иначе быстрый переход восстанавливает прежнюю сессию.
    void (async () => {
      await logoutMutation({ context: { optionalSession: true } }).catch(() => undefined);
      setUser(null);
      await apolloClient.clearStore();
      navigate("/login", { replace: true, state: null });
      logoutPending.current = false;
    })();
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
      isLoading: !sessionRestored || (user == null && meLoading),
      signIn,
      logout,
    }),
    [logout, meLoading, sessionRestored, signIn, user],
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
