import { gql } from "@apollo/client";
import { USER_FIELDS } from "./mutations";

// Сессия хранится в httpOnly cookie, поэтому текущий пользователь восстанавливается через me,
// а не из токена (токен JS недоступен).
export const ME_QUERY = gql`
  query Me {
    me {
      id
      isAdmin
      isSuperuser
    }
  }
`;

export const GET_USER_QUERY = gql`
  query GetUser($id: ID!) {
    getUser(id: $id) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
