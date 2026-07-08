import { gql } from "@apollo/client";
import { USER_FIELDS } from "./mutations";

export const GET_USER_QUERY = gql`
  query GetUser($id: ID!) {
    getUser(id: $id) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
