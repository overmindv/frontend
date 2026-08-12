declare module "apollo-upload-client/createUploadLink.mjs" {
  import type { ApolloLink } from "@apollo/client";

  interface CreateUploadLinkOptions {
    uri?: string;
  }

  export default function createUploadLink(
    options?: CreateUploadLinkOptions,
  ): ApolloLink;
}
