import {
  ApolloClient,
  InMemoryCache,
  from,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";

let unauthenticatedHandler: () => void = () => undefined;

export function setUnauthenticatedHandler(handler: () => void) {
  unauthenticatedHandler = handler;
  return () => {
    unauthenticatedHandler = () => undefined;
  };
}

// Сессия живёт в httpOnly cookie (`ovm_session`), которая приходит с ответом login/register
// и отправляется браузером автоматически. Токен недоступен JS — это защищает от кражи через XSS.
const errorLink = onError(({ graphQLErrors, networkError }) => {
  const graphUnauthenticated = graphQLErrors?.some(
    (error) => error.extensions?.code === "UNAUTHENTICATED",
  );
  const statusCode =
    networkError && "statusCode" in networkError
      ? networkError.statusCode
      : undefined;

  if (graphUnauthenticated || statusCode === 401) {
    unauthenticatedHandler();
  }
});

const uploadLink = createUploadLink({
  uri: import.meta.env.VITE_API_URL ?? "/graphql",
  fetchOptions: { credentials: "include" },
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, uploadLink]),
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
