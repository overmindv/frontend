import { ApolloError } from "@apollo/client";

const genericMessage = "Не удалось выполнить действие. Попробуйте ещё раз.";

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApolloError) {
    return genericMessage;
  }
  if (error instanceof Error) {
    return genericMessage;
  }
  return genericMessage;
}
