import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  from,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";

export const TOKEN_STORAGE_KEY = "soundwave.token";
export const USER_ID_STORAGE_KEY = "soundwave.userId";

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

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_API_URL ?? "http://localhost:8081/graphql",
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      User: { keyFields: ["id"] },
      University: { keyFields: ["id"] },
      Program: { keyFields: ["id"] },
      Course: { keyFields: ["id"] },
      Topic: { keyFields: ["id"] },
    },
  }),
  connectToDevTools: import.meta.env.DEV,
});
