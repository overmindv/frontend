import { gql, type TypedDocumentNode } from "@apollo/client";
import type * as Schema from "./generated";

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

export const REGISTER_MUTATION: TypedDocumentNode<Schema.RegisterMutation, Schema.RegisterMutationVariables> = gql`
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

export const LOGIN_MUTATION: TypedDocumentNode<Schema.LoginMutation, Schema.LoginMutationVariables> = gql`
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

export const UPDATE_USER_MUTATION: TypedDocumentNode<Schema.UpdateUserMutation, Schema.UpdateUserMutationVariables> = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const LOGOUT_MUTATION: TypedDocumentNode<Schema.LogoutMutation, Schema.LogoutMutationVariables> = gql`
  mutation Logout {
    logout
  }
`;

export const CREATE_MEDIA_UPLOAD_MUTATION: TypedDocumentNode<Schema.CreateMediaUploadMutation, Schema.CreateMediaUploadMutationVariables> = gql`
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

export const COMPLETE_MEDIA_UPLOAD_MUTATION: TypedDocumentNode<Schema.CompleteMediaUploadMutation, Schema.CompleteMediaUploadMutationVariables> = gql`
  mutation CompleteMediaUpload($input: CompleteMediaUploadInput!) {
    completeMediaUpload(input: $input) {
      id
      status
    }
  }
`;

export const SET_MY_AVATAR_MUTATION: TypedDocumentNode<Schema.SetMyAvatarMutation, Schema.SetMyAvatarMutationVariables> = gql`
  mutation SetMyAvatar($fileId: ID) {
    setMyAvatar(fileId: $fileId) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;
