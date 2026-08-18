import { gql } from "@apollo/client";

export const PUBLIC_USER_FIELDS = gql`
  fragment PublicUserFields on PublicUser {
    id username firstName lastName isAdmin createdAt
    avatar { fileId smallUrl mediumUrl }
  }
`;

export const USER_PROFILE_QUERY = gql`
  query UserProfile($id: ID!) { userProfile(id: $id) { ...PublicUserFields } }
  ${PUBLIC_USER_FIELDS}
`;

export const SEARCH_USERS_QUERY = gql`
  query SearchUsers($search: String!, $pagination: PaginationInput) {
    searchUsers(search: $search, pagination: $pagination) { items { ...PublicUserFields } limit offset }
  }
  ${PUBLIC_USER_FIELDS}
`;
