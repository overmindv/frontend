declare module "apollo-upload-client/createUploadLink.mjs" {
  import type { ApolloLink } from "@apollo/client";

  interface CreateUploadLinkOptions {
    fetch?: typeof fetch;
    uri?: string;
    fetchOptions?: RequestInit;
    credentials?: string;
  }

  export default function createUploadLink(
    options?: CreateUploadLinkOptions,
  ): ApolloLink;
}
