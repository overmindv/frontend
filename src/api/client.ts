import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  from,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";

export const TOKEN_STORAGE_KEY = "frontend.token";
export const USER_ID_STORAGE_KEY = "frontend.userId";

let unauthenticatedHandler: () => void = () => undefined;

export function setUnauthenticatedHandler(handler: () => void) {
  unauthenticatedHandler = handler;
  return () => {
    unauthenticatedHandler = () => undefined;
  };
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
}

// storeStoredAuth сохраняет проверенные credentials до выполнения авторизованных запросов.
export function storeStoredAuth(token: string, userID: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_ID_STORAGE_KEY, userID);
}

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }));
  return forward(operation);
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  const graphUnauthenticated = graphQLErrors?.some(
    (error) => error.extensions?.code === "UNAUTHENTICATED",
  );
  const statusCode =
    networkError && "statusCode" in networkError
      ? networkError.statusCode
      : undefined;

  if (graphUnauthenticated || statusCode === 401) {
    clearStoredAuth();
    unauthenticatedHandler();
  }
});

const uploadLink = createUploadLink({
  uri: import.meta.env.VITE_API_URL ?? "http://localhost:8081/graphql",
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, uploadLink]),
  cache: new InMemoryCache({
    typePolicies: {
      User: { keyFields: ["id"] },
      University: { keyFields: ["id"] },
      Program: { keyFields: ["id"] },
      Course: { keyFields: ["id"] },
      Topic: { keyFields: ["id"] },
      ITTask: { keyFields: ["id"] },
      ITTaskSummary: { keyFields: ["id"] },
      ITSubmission: { keyFields: ["id"] },
      ITCodeSubmission: { keyFields: ["id"] },
    },
  }),
  connectToDevTools: import.meta.env.DEV,
});
