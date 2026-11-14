import { MockedProvider } from "@apollo/client/testing";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { meMock } from "../../test/authMocks";
import {
  IT_CODE_SUBMISSION_QUERY,
  IT_TASK_QUERY,
  IT_TASK_TOPICS_QUERY,
  IT_TASKS_QUERY,
  MY_IT_CODE_SUBMISSIONS_QUERY,
  MY_IT_SUBMISSIONS_QUERY,
  SUBMIT_IT_TASK_ANSWER,
  SUBMIT_IT_TASK_CODE,
} from "../../api/tasks";
import { AuthProvider } from "../../context/AuthContext";
import { CodeSubmissionDetailPage, TaskSolvePage, TasksPage } from "./TasksPages";

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

test("статус учитывает неверный и верный ответ, сохраняя успех при ошибке истории без дублирования попытки", async () => {
  vi.spyOn(globalThis.crypto, "randomUUID")
    .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
    .mockReturnValueOnce("22222222-2222-4222-8222-222222222222");
  const user = userEvent.setup();
  const historyRequest = { query: MY_IT_SUBMISSIONS_QUERY, variables: { taskId: task.id, pagination: { limit: 100, offset: 0 } } };
  const submission = (correct: boolean) => ({
    __typename: "ITSubmission", id: correct ? "right" : "wrong", userId: "user-id", taskId: task.id,
    taskVersionId: task.taskVersionId, taskVersionNumber: 1, taskTitle: "Название сохранённой версии",
    selectedOptionIds: [correct ? "option-a" : "option-b"], correctOptionIds: ["option-a"],
    correct, verdict: correct ? "accepted" : "wrong_answer", taskUpdated: false,
    latestTaskVersionId: task.taskVersionId, latestVersionNumber: 1, createdAt: "2026-08-03T10:05:00Z",
  });
  const answer = (correct: boolean) => ({
    request: { query: SUBMIT_IT_TASK_ANSWER, variables: { taskId: task.id, input: {
      taskVersionId: task.taskVersionId, idempotencyKey: correct ? "22222222-2222-4222-8222-222222222222" : "11111111-1111-4111-8111-111111111111",
      selectedOptionIds: [correct ? "option-a" : "option-b"],
    } } }, result: { data: { submitITTaskAnswer: submission(correct) } },
  });
  const refreshFailure = new Error("history unavailable");
  let failedRefreshes = 0;
  const historyFailure = () => ({ request: { query: MY_IT_SUBMISSIONS_QUERY }, error: refreshFailure,
    variableMatcher: () => { failedRefreshes += 1; return true; },
  });
  render(<MockedProvider addTypename={false} mocks={[
    meMock(), { request: { query: IT_TASK_QUERY, variables: { id: task.id } }, result: { data: { itTask: task } } },
    { request: historyRequest, result: { data: { myITSubmissions: { items: [], limit: 100, offset: 0 } } } },
    { request: { query: MY_IT_CODE_SUBMISSIONS_QUERY, variables: historyRequest.variables }, result: { data: { myITCodeSubmissions: { items: [], limit: 100, offset: 0 } } } },
    answer(false), { request: historyRequest, result: { data: { myITSubmissions: { items: [submission(false)], limit: 100, offset: 0 } } } },
    answer(true), historyFailure(), answer(true), historyFailure(),
  ]}><MemoryRouter initialEntries={[`/tasks/${task.id}`]}><AuthProvider><Routes><Route path="/tasks/:id" element={<TaskSolvePage />} /></Routes></AuthProvider></MemoryRouter></MockedProvider>);
  await screen.findByText("Ещё не решалась");
  await user.click(screen.getByText("Требуют implements"));
  await user.click(screen.getByRole("button", { name: "Проверить ответ" }));
  await screen.findByText("Есть решение, но неверное");
  expect(screen.getByText("Попытки").nextElementSibling).toHaveTextContent("1");
  expect(screen.getByText("Принято").nextElementSibling).toHaveTextContent("0");
  await user.click(screen.getByText("Реализуются неявно"));
  await user.click(screen.getByRole("button", { name: "Проверить ответ" }));
  await screen.findByText("Решена правильно");
  await waitFor(() => expect(failedRefreshes).toBe(1));
  await user.click(screen.getByRole("button", { name: "Проверить ещё раз" }));
  await waitFor(() => expect(failedRefreshes).toBe(2));
  expect(screen.getByText("Ответ принят")).toBeInTheDocument();
  expect(screen.getByText("Решена правильно")).toBeInTheDocument();
  expect(screen.getByText("Попытки").nextElementSibling).toHaveTextContent("2");
  expect(screen.getByText("Принято").nextElementSibling).toHaveTextContent("1");
  expect(screen.getByText("50%")).toBeInTheDocument();
  expect(screen.queryByText("Ещё не решалась")).not.toBeInTheDocument();
});

// TestTaskSolveFlow проверяет выбор ответа, submit и уведомление о новой версии.
test("пользователь решает открытую версию теста", async () => {
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("11111111-1111-4111-8111-111111111111");
  const user = userEvent.setup();

  render(
    <MockedProvider
      addTypename={false}
      mocks={[
        meMock(),
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
                taskVersionNumber: 1, taskTitle: "Название сохранённой версии",
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
  expect(screen.getByText("Задача была обновлена")).toBeInTheDocument();
});

// TestProgrammingTaskUpload проверяет выбор файла и отображение результата sandbox.
test("пользователь отправляет файл programming-задачи", async () => {
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("22222222-2222-4222-8222-222222222222");

  const user = userEvent.setup();
  const sourceFile = new File(["print(4)"], "solution.py", {
    type: "text/x-python",
  });

  render(
    <MockedProvider
      addTypename={false}
      mocks={[
        meMock(),
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
                taskVersionNumber: 1, taskTitle: "Название сохранённой версии",
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
  const editor = screen.getByRole("textbox", { name: "Код решения" });
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

  await user.click(screen.getByRole("tab", { name: "Загрузить файл" }));
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

// TestCodeSubmissionDetail показывает сохранённый результат программной попытки.
test("страница результата кодового решения показывает сохранённый вывод и подробности теста", async () => {
  const user = userEvent.setup();
  const programmingTask = {
    ...task,
    id: "programming-id",
    taskVersionId: "version-id",
    title: "Калькулятор",
    statement: "Вычислите значение выражения",
    taskType: "programming",
    options: [],
    tags: [],
    examples: [{ __typename: "ITTaskExample", input: "2 + 2", output: "4", explanation: "" }],
    constraints: [],
    source: null,
  };

  render(
    <MockedProvider
      mocks={[
        meMock(),
        {
          request: { query: IT_CODE_SUBMISSION_QUERY, variables: { id: "code-submission-id" } },
          result: {
            data: {
              itCodeSubmission: {
                __typename: "ITCodeSubmission",
                id: "code-submission-id",
                userId: "user-id",
                taskId: "programming-id",
                taskVersionId: "version-id",
                taskVersionNumber: 1, taskTitle: "Название сохранённой версии",
                executionId: "execution-id",
                correlationId: "correlation-id",
                language: "python",
                sourceFileName: "solution.py",
                status: "completed",
                verdict: "accepted",
                compilation: null,
                execution: {
                  __typename: "ITExecutionPhaseResult",
                  exitCode: 0,
                  stdout: "4\n",
                  stderr: "",
                  durationMs: 7,
                  memoryBytes: 1024,
                },
                tests: [
                  { __typename: "ITExecutionTestResult", testId: "t1", verdict: "accepted", stdout: "4\n", stderr: "", durationMs: 7, memoryBytes: 1024 },
                ],
                failure: null,
                createdAt: "2026-08-13T10:00:00Z",
                updatedAt: "2026-08-13T10:00:01Z",
                completedAt: "2026-08-13T10:00:01Z",
              },
            },
          },
        },
        {
          request: { query: IT_TASK_QUERY, variables: { id: "programming-id" } },
          result: { data: { itTask: programmingTask } },
        },
      ]}
    >
      <MemoryRouter initialEntries={["/code-submission/code-submission-id"]}>
        <AuthProvider>
          <Routes>
            <Route path="/code-submission/:id" element={<CodeSubmissionDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  expect(await screen.findByRole("heading", { name: "Решение принято" })).toBeInTheDocument();
  // sourceCode is submission input only; the saved result exposes execution output.
  expect(screen.getByText("4", { selector: "pre" })).toBeInTheDocument();
  expect(screen.getByText("solution.py")).toBeInTheDocument();
  expect(screen.getByText("Python")).toBeInTheDocument();
  expect(screen.getByText("1 из 1 тестов прошло")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Открыть задачу" })).toHaveAttribute("href", "/tasks/programming-id");

  const testDetails = screen.getByRole("button", { name: /Тест 1/ });
  expect(testDetails).toHaveAttribute("aria-expanded", "false");
  await user.click(testDetails);

  expect(testDetails).toHaveAttribute("aria-expanded", "true");
  expect(await screen.findByText("2 + 2", { selector: "pre" })).toBeInTheDocument();
  expect(within(screen.getByText("Ожидаемый вывод").parentElement!).getByText("4", { selector: "pre" })).toBeInTheDocument();
  expect(within(screen.getByText("Фактический вывод").parentElement!).getByText("4", { selector: "pre" })).toBeInTheDocument();
});

// TestTaskSolveStatusBanner показывает маркер «решена правильно» при повторном открытии.
test("на странице задачи показывается, что задача решена правильно", async () => {
  render(
    <MockedProvider
      mocks={[
        meMock(),
        { request: { query: IT_TASK_QUERY, variables: { id: "task-id" } }, result: { data: { itTask: task } } },
        {
          request: { query: MY_IT_SUBMISSIONS_QUERY, variables: { taskId: "task-id", pagination: { limit: 100, offset: 0 } } },
          result: {
            data: {
              myITSubmissions: {
                items: [
                  {
                    __typename: "ITSubmission",
                    id: "submission-id",
                    userId: "user-id",
                    taskId: "task-id",
                    taskVersionId: "version-id",
                    taskVersionNumber: 1, taskTitle: "Название сохранённой версии",
                    selectedOptionIds: ["option-a"],
                    correctOptionIds: ["option-a"],
                    correct: true,
                    verdict: "accepted",
                    taskUpdated: false,
                    latestTaskVersionId: "version-id",
                    latestVersionNumber: 1,
                    createdAt: "2026-08-03T10:05:00Z",
                  },
                ],
                limit: 100,
                offset: 0,
              },
            },
          },
        },
        {
          request: { query: MY_IT_CODE_SUBMISSIONS_QUERY, variables: { taskId: "task-id", pagination: { limit: 100, offset: 0 } } },
          result: { data: { myITCodeSubmissions: { items: [], limit: 100, offset: 0 } } },
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

  expect(await screen.findByText("Решена правильно")).toBeInTheDocument();
  expect(screen.getByText("100%")).toBeInTheDocument();
  expect(screen.getByText("Попытки")).toBeInTheDocument();
});
