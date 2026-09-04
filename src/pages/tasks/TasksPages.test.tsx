import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { TOKEN_STORAGE_KEY, USER_ID_STORAGE_KEY } from "../../api/client";
import {
  IT_TASK_QUERY,
  IT_TASK_TOPICS_QUERY,
  IT_TASKS_QUERY,
  SUBMIT_IT_TASK_ANSWER,
  SUBMIT_IT_TASK_CODE,
} from "../../api/tasks";
import { AuthProvider } from "../../context/AuthContext";
import { TaskSolvePage, TasksPage } from "./TasksPages";

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

// TestProgrammingTaskUpload проверяет выбор файла и отображение результата sandbox.
test("пользователь отправляет файл programming-задачи", async () => {
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(USER_ID_STORAGE_KEY, "user-id");
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("22222222-2222-4222-8222-222222222222");

  const user = userEvent.setup();
  const sourceFile = new File(["print(4)"], "solution.py", {
    type: "text/x-python",
  });

  render(
    <MockedProvider
      addTypename={false}
      mocks={[
        {
          request: { query: IT_TASK_QUERY, variables: { id: "programming-id" } },
          result: {
            data: {
              itTask: {
                ...task,
                id: "programming-id",
                taskVersionId: "programming-version-id",
                title: "Калькулятор",
                statement: "Вычислите значение выражения",
                taskType: "programming",
                options: [],
                tags: ["math"],
                examples: [{ input: "2 + 2", output: "4", explanation: "Сложение" }],
                constraints: ["Ввод корректен"],
                source: {
                  sourceId: "coderun",
                  sourceName: "CodeRun",
                  sourceUrl: "https://coderun.yandex.ru/problem/calculator",
                  publishedAt: null,
                },
              },
            },
          },
        },
        {
          request: {
            query: SUBMIT_IT_TASK_CODE,
            variables: {
              taskId: "programming-id",
              input: {
                taskVersionId: "programming-version-id",
                idempotencyKey: "22222222-2222-4222-8222-222222222222",
                language: "python",
                file: sourceFile,
              },
            },
          },
          result: {
            data: {
              submitITTaskCode: {
                id: "code-submission-id",
                userId: "user-id",
                taskId: "programming-id",
                taskVersionId: "programming-version-id",
                taskVersionNumber: 1,
                executionId: "execution-id",
                correlationId: "correlation-id",
                language: "python",
                sourceFileName: "solution.py",
                status: "completed",
                verdict: "accepted",
                compilation: null,
                execution: {
                  exitCode: 0,
                  stdout: "4\n",
                  stderr: "",
                  durationMs: 7,
                  memoryBytes: 1024,
                },
                tests: [],
                failure: null,
                createdAt: "2026-08-13T10:00:00Z",
                updatedAt: "2026-08-13T10:00:01Z",
                completedAt: "2026-08-13T10:00:01Z",
              },
            },
          },
        },
      ]}
    >
      <MemoryRouter initialEntries={["/tasks/programming-id"]}>
        <AuthProvider>
          <Routes>
            <Route path="/tasks/:id" element={<TaskSolvePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  expect(await screen.findByRole("heading", { name: "Калькулятор" })).toBeInTheDocument();
  const editor = screen.getByRole("textbox", { name: "Черновик решения" });
  await user.type(editor, "print(4)");
  expect(editor).toHaveValue("print(4)");
  const separator = screen.getByRole("separator", { name: "Изменить ширину панелей" });
  separator.focus();
  await user.keyboard("{ArrowRight}");
  expect(localStorage.getItem("overmindv-solve-split")).toBe("52");
  expect(screen.getByText("math")).toBeInTheDocument();
  expect(screen.getByText("Ввод корректен")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Открыть оригинал/ })).toHaveAttribute(
    "href",
    "https://coderun.yandex.ru/problem/calculator",
  );

  await user.upload(screen.getByLabelText(/Выберите файл решения/), sourceFile);

  expect(screen.getByText(/готов к отправке/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Отправить на проверку" }));

  expect(await screen.findByText("✓ Решение принято")).toBeInTheDocument();
  expect(screen.getByText("7 мс")).toBeInTheDocument();
});

test("карточка задачи целиком ведёт на страницу задачи", async () => {
  render(<MockedProvider mocks={[
    { request: { query: IT_TASK_TOPICS_QUERY }, result: { data: { topics: [] } } },
    { request: { query: IT_TASKS_QUERY, variables: { filter: {}, pagination: { limit: 12, offset: 0 } } }, result: { data: { itTasks: { __typename: "ITTaskList", items: [{ __typename: "ITTaskSummary", id: "task-id", status: "published", taskVersionId: "version-id", versionNumber: 1, topicId: null, title: "Интерфейсы Go", taskType: "single_choice", difficulty: "easy", createdAt: "2026-08-03T10:00:00Z", updatedAt: "2026-08-03T10:00:00Z" }], limit: 12, offset: 0 } } } },
  ]}><MemoryRouter><TasksPage /></MemoryRouter></MockedProvider>);

  const card = await screen.findByRole("link", { name: "Открыть задачу Интерфейсы Go" });
  expect(card).toHaveAttribute("href", "/tasks/task-id");
  expect(screen.queryByText("Решить")).not.toBeInTheDocument();
});
