import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AdminUsersQuery,
  AdminUsersQueryVariables,
  SetUserAdminMutation,
  SetUserAdminMutationVariables,
} from "./generated";
import { USER_FIELDS } from "./mutations";

export type AdminUser = AdminUsersQuery["users"][number];

export const ADMIN_USERS_QUERY: TypedDocumentNode<AdminUsersQuery, AdminUsersQueryVariables> = gql`
  query AdminUsers($search: String) {
    users(search: $search) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const SET_USER_ADMIN: TypedDocumentNode<SetUserAdminMutation, SetUserAdminMutationVariables> = gql`
  mutation SetUserAdmin($id: ID!, $admin: Boolean!) {
    setUserAdmin(id: $id, admin: $admin) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
