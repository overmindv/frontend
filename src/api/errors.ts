import { ApolloError } from "@apollo/client";

const messages: Record<string, string> = {
  ALREADY_EXISTS: "Пользователь с такой почтой или username уже существует.",
  INVALID_ARGUMENT: "Проверьте правильность заполнения полей.",
  UNAUTHENTICATED: "Неверная почта или пароль. Войдите снова.",
  NOT_FOUND: "Пользователь не найден.",
  DEADLINE_EXCEEDED: "Сервис не успел ответить. Попробуйте ещё раз.",
  SERVICE_UNAVAILABLE: "Сервис временно недоступен.",
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApolloError) {
    const code = error.graphQLErrors[0]?.extensions?.code;
    if (typeof code === "string" && messages[code]) {
      return messages[code];
    }
    return error.message || "Не удалось выполнить запрос.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Произошла неизвестная ошибка.";
}
