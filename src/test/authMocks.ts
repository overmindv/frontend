import type { MockedResponse } from "@apollo/client/testing";
import { ME_QUERY } from "../api/queries";

// AuthUserShape — подмножество полей, которые AuthProvider читает из me.
interface AuthUserShape {
  id: string;
  isAdmin: boolean;
  isSuperuser: boolean;
}

export const authUser: AuthUserShape = {
  id: "user-id",
  isAdmin: false,
  isSuperuser: false,
};

// meMock возвращает mock для восстановления сессии (me-запрос) в AuthProvider.
// Передайте null, чтобы сессия считалась отсутствующей.
export function meMock(user: AuthUserShape | null = authUser): MockedResponse {
  return {
    request: { query: ME_QUERY },
    result: { data: { me: user } },
  };
}
