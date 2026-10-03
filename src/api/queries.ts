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

// PUBLIC_USER_QUERY — безопасный публичный профиль (без email/phone/birthDate).
// Используется для чужих профилей: `getUser` отдаёт полные данные только владельцу/админу.
export const PUBLIC_USER_QUERY = gql`
  query PublicUserProfile($id: ID!) {
    userProfile(id: $id) {
      id
      username
      firstName
      lastName
      avatar {
        smallUrl
        mediumUrl
      }
      isAdmin
      createdAt
    }
  }
`;

export const MEDIA_FILE_QUERY = gql`
  query MediaFile($id: ID!) {
    mediaFile(id: $id) {
      id
      status
      purpose
    }
  }
`;
