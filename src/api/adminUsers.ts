import { gql } from "@apollo/client";
import { USER_FIELDS } from "./mutations";

export const ADMIN_USERS_QUERY = gql`
  query AdminUsers($search: String) {
    users(search: $search) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const SET_USER_ADMIN = gql`
  mutation SetUserAdmin($id: ID!, $admin: Boolean!) {
    setUserAdmin(id: $id, admin: $admin) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
