import { gql } from "@apollo/client";

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    email
    username
    firstName
    lastName
    birthDate
    phone
    avatar {
      fileId
      smallUrl
      mediumUrl
    }
    roles
    isAdmin
    isSuperuser
    createdAt
    updatedAt
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      expiresAt
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      expiresAt
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const CREATE_MEDIA_UPLOAD_MUTATION = gql`
  mutation CreateMediaUpload($input: CreateMediaUploadInput!) {
    createMediaUpload(input: $input) {
      fileId
      mode
      url
      fields {
        name
        value
      }
      headers {
        name
        value
      }
      multipartUploadId
      partSize
      expiresAt
    }
  }
`;

export const COMPLETE_MEDIA_UPLOAD_MUTATION = gql`
  mutation CompleteMediaUpload($input: CompleteMediaUploadInput!) {
    completeMediaUpload(input: $input) {
      id
      status
    }
  }
`;

export const SET_MY_AVATAR_MUTATION = gql`
  mutation SetMyAvatar($fileId: ID) {
    setMyAvatar(fileId: $fileId) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
