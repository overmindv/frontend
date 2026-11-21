import { ApolloError } from "@apollo/client";

const encoder = new TextEncoder();

export function fitsReviewText(text: string) {
  return text.length <= 4096 && encoder.encode(text).length <= 4096;
}

export function hasReviewError(error: unknown, code: string) {
  return error instanceof ApolloError && error.graphQLErrors.some(({ extensions }) => extensions?.code === code);
}
