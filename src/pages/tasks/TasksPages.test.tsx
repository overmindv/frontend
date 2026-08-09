import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { TOKEN_STORAGE_KEY, USER_ID_STORAGE_KEY } from "../../api/client";
import { IT_TASK_QUERY, SUBMIT_IT_TASK_ANSWER } from "../../api/tasks";
import { AuthProvider } from "../../context/AuthContext";
import { TaskSolvePage } from "./TasksPages";

const task = {
  __typename: "ITTask",
  id: "task-id",
  status: "published",
  taskVersionId: "version-id",
  versionNumber: 1,
  topicId: null,
  title: "Интерфейсы Go",
  statement: "Выберите верное утверждение",
  taskType: "single_choice",
  difficulty: "easy",
  createdAt: "2026-08-03T10:00:00Z",
  updatedAt: "2026-08-03T10:00:00Z",
  options: [
    { __typename: "ITTaskOption", id: "option-a", text: "Реализуются неявно", position: 0, isCorrect: null },
    { __typename: "ITTaskOption", id: "option-b", text: "Требуют implements", position: 1, isCorrect: null },
  ],
};

// TestTaskSolveFlow проверяет выбор ответа, submit и уведомление о новой версии.
test("пользователь решает открытую версию теста", async () => {
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(USER_ID_STORAGE_KEY, "user-id");
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("11111111-1111-4111-8111-111111111111");
  const user = userEvent.setup();

  render(
    <MockedProvider
      addTypename={false}
      mocks={[
        {
          request: { query: IT_TASK_QUERY, variables: { id: "task-id" } },
          result: { data: { itTask: task } },
        },
        {
          request: {
            query: SUBMIT_IT_TASK_ANSWER,
            variables: {
              taskId: "task-id",
              input: {
                taskVersionId: "version-id",
                idempotencyKey: "11111111-1111-4111-8111-111111111111",
                selectedOptionIds: ["option-a"],
              },
            },
          },
          result: {
            data: {
              submitITTaskAnswer: {
                __typename: "ITSubmission",
                id: "submission-id",
                userId: "user-id",
                taskId: "task-id",
                taskVersionId: "version-id",
                taskVersionNumber: 1,
                selectedOptionIds: ["option-a"],
                correctOptionIds: ["option-a"],
                correct: true,
                verdict: "accepted",
                taskUpdated: true,
                latestTaskVersionId: "version-id-2",
                latestVersionNumber: 2,
                createdAt: "2026-08-03T10:05:00Z",
              },
            },
          },
        },
      ]}
    >
      <MemoryRouter initialEntries={["/tasks/task-id"]}>
        <AuthProvider>
          <Routes>
            <Route path="/tasks/:id" element={<TaskSolvePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  expect(await screen.findByRole("heading", { name: "Интерфейсы Go" })).toBeInTheDocument();
  expect(screen.queryByText("верный")).not.toBeInTheDocument();
  await user.click(screen.getByText("Реализуются неявно"));
  await user.click(screen.getByRole("button", { name: "Проверить ответ" }));

  expect(await screen.findByText("Ответ принят")).toBeInTheDocument();
  expect(screen.getByText("Тест был обновлён")).toBeInTheDocument();
});
