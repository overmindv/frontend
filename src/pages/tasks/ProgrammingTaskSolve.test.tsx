import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { IT_TASK_QUERY, IT_CODE_SUBMISSION_QUERY, SUBMIT_IT_TASK_CODE, MY_IT_SUBMISSIONS_QUERY, MY_IT_CODE_SUBMISSIONS_QUERY, type ITTask, type ITCodeSubmission } from "../../api/tasks";
import { AuthProvider } from "../../context/AuthContext";
import { meMock } from "../../test/authMocks";
import { TaskSolvePage } from "./TasksPages";

const programmingTask = {
  __typename: "ITTask",
  id: "programming-id",
  status: "published",
  taskVersionId: "programming-version-id",
  versionNumber: 1,
  topicId: null,
  title: "Калькулятор",
  statement: "Вычислите значение выражения",
  taskType: "programming",
  difficulty: "easy",
  createdAt: "2026-08-03T10:00:00Z",
  updatedAt: "2026-08-03T10:00:00Z",
  options: [],
  tags: ["math"],
  examples: [
    { input: "2 + 2", output: "4", explanation: "Сложение" },
    { input: "1 + 1", output: "2", explanation: "Вычитание" },
  ],
  constraints: ["Ввод корректен"],
  source: null,
};

// completedCodeSubmission имитирует ответ sandbox: тест 1 принят, тест 2 — неверный ответ.
const completedCodeSubmission = {
  __typename: "ITCodeSubmission",
  id: "code-submission-id",
  userId: "user-id",
  taskId: "programming-id",
  taskVersionId: "programming-version-id",
  taskVersionNumber: 1,
  executionId: "execution-id",
  correlationId: "correlation-id",
  runMode: "samples",
  language: "python",
  sourceFileName: "solution.py",
  status: "completed",
  verdict: "wrong_answer",
  compilation: null,
  execution: {
    exitCode: 0,
    stdout: "4\n",
    stderr: "",
    durationMs: 7,
    memoryBytes: 1024,
  },
  tests: [
    {
      testId: "open-1",
      verdict: "accepted",
      stdout: "4\n",
      stderr: "",
      durationMs: 5,
      memoryBytes: 1024,
    },
    {
      testId: "open-2",
      verdict: "wrong_answer",
      stdout: "5\n",
      stderr: "",
      durationMs: 9,
      memoryBytes: 2048,
    },
  ],
  failure: null,
  createdAt: "2026-08-13T10:00:00Z",
  updatedAt: "2026-08-13T10:00:01Z",
  completedAt: "2026-08-13T10:00:01Z",
};

// renderSolve монтирует TaskSolvePage в окружении, аналогичном TasksPages.test.tsx.
function renderSolve() {
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("33333333-3333-4333-8333-333333333333");

  const sourceFile = new File(["print(4)"], "solution.py", { type: "text/x-python" });

  return {
    sourceFile,
    user: userEvent.setup(),
    view: render(
      <MockedProvider
        addTypename={false}
        mocks={[
          meMock(),
          {
            request: { query: IT_TASK_QUERY, variables: { id: "programming-id" } },
            result: { data: { itTask: programmingTask } },
          },
          {
            request: {
              query: SUBMIT_IT_TASK_CODE,
              variables: {
                taskId: "programming-id",
                input: {
                  taskVersionId: "programming-version-id",
                  idempotencyKey: "33333333-3333-4333-8333-333333333333",
                  runMode: "samples",
  language: "python",
                  file: sourceFile,
                },
              },
            },
            result: { data: { submitITTaskCode: completedCodeSubmission } },
          },
          {
            request: {
              query: SUBMIT_IT_TASK_CODE,
              variables: {
                taskId: "programming-id",
                input: {
                  taskVersionId: "programming-version-id",
                  idempotencyKey: "33333333-3333-4333-8333-333333333333",
                  runMode: "samples",
  language: "python",
                  sourceCode: "print(input())",
                },
              },
            },
            result: { data: { submitITTaskCode: completedCodeSubmission } },
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
    ),
  };
}

// LeetCodeResultPanel проверяет сводку «X из N тестов прошло», пер-кейс вывод
// (вход/ожидаемый/фактический) и раскрытие кейсов по клику.
test("панель результата показывает сводку и сворачиваемые кейсы", async () => {
  const { user, sourceFile } = renderSolve();

  expect(await screen.findByRole("heading", { name: "Калькулятор" })).toBeInTheDocument();

  // Файловый способ: переключаемся в режим «Загрузить файл», выбираем файл и отправляем.
  await user.click(screen.getByRole("tab", { name: "Загрузить файл" }));
  await user.upload(screen.getByLabelText(/Выберите файл решения/), sourceFile);
  await user.click(screen.getByRole("button", { name: "Проверить примеры" }));

  // Сводка и итоговый вердикт (чип сводки + чип второго кейса).
  expect(await screen.findByText("1 из 2 тестов прошло")).toBeInTheDocument();
  expect(screen.getAllByText(/Неверный ответ/)).toHaveLength(2);

  // Кейсы по умолчанию свёрнуты: «Фактический вывод» (только в панели) не отображается.
  expect(screen.queryAllByText("Фактический вывод")).toHaveLength(0);

  // Раскрываем первый кейс — появляются его вход/ожидаемый/фактический вывод.
  await user.click(screen.getByRole("button", { name: /Тест 1/ }));
  expect(screen.getAllByText("Фактический вывод")).toHaveLength(1);

  const firstCase = screen.getByRole("button", { name: /Тест 1/ }).closest("article") as HTMLElement;
  expect(within(firstCase).getByText("Ожидаемый вывод")).toBeInTheDocument();
  expect(within(firstCase).getByText("Фактический вывод")).toBeInTheDocument();
  // Вход «2 + 2», ожидаемый и фактический вывод по «4» (принятый тест не подсвечивается).
  expect(within(firstCase).getByText("2 + 2")).toBeInTheDocument();
  expect(within(firstCase).getAllByText("4")).toHaveLength(2);
  expect(firstCase.querySelector(".code-test-case__io > div.is-wrong")).toBeNull();

  // Раскрываем второй (неверный) кейс — фактический вывод 5 подсвечивается как is-wrong.
  await user.click(screen.getByRole("button", { name: /Тест 2/ }));
  const secondCase = screen.getByRole("button", { name: /Тест 2/ }).closest("article") as HTMLElement;
  expect(within(secondCase).getByText("5")).toBeInTheDocument();
  expect(secondCase.querySelector(".code-test-case__io > div.is-wrong")).not.toBeNull();
});

// Код из консоли — основной режим по умолчанию: введённый код отправляется как sourceCode.
test("код из консоли отправляется как sourceCode", async () => {
  const { user } = renderSolve();

  expect(await screen.findByRole("heading", { name: "Калькулятор" })).toBeInTheDocument();

  // По умолчанию активен режим «Ввести код»; файл-дроп скрыт.
  expect(screen.getByRole("tab", { name: "Ввести код" })).toHaveAttribute("aria-selected", "true");
  expect(screen.queryByLabelText(/Выберите файл решения/)).not.toBeInTheDocument();

  await user.type(screen.getByLabelText(/Код решения/), "print(input())");
  await user.click(screen.getByRole("button", { name: "Проверить примеры" }));

  // Результат sandbox отображается после ответа мутации с sourceCode.
  expect(await screen.findByText("1 из 2 тестов прошло")).toBeInTheDocument();
});

const attemptKey = "33333333-3333-4333-8333-333333333333";
function renderActions(mocks: MockedResponse[]) {
  vi.spyOn(crypto, "randomUUID").mockReturnValue(attemptKey);
  render(<MockedProvider mocks={mocks} addTypename={false}>
    <MemoryRouter><ProgrammingTaskSolve task={programmingTask as ITTask} isAuthenticated /></MemoryRouter>
  </MockedProvider>);
  return userEvent.setup();
}
function actionMock(runMode: "samples" | "graded", options: Partial<MockedResponse> = {}): MockedResponse {
  return {
    request: { query: SUBMIT_IT_TASK_CODE, variables: { taskId: programmingTask.id, input: {
      taskVersionId: programmingTask.taskVersionId, idempotencyKey: attemptKey,
      runMode, language: "python", sourceCode: "print(input())",
    } } },
    result: { data: { submitITTaskCode: { ...completedCodeSubmission, runMode } } },
    ...options,
  };
}

test.each(["samples", "graded"] as const)("%s: двойной клик создаёт один запрос", async (runMode) => {
  const result = vi.fn(() => ({ data: { submitITTaskCode: { ...completedCodeSubmission, runMode } } }));
  const user = renderActions([actionMock(runMode, { result, delay: 100 })]);
  await user.type(screen.getByLabelText("Код решения"), "print(input())");
  await user.dblClick(screen.getByRole("button", { name: runMode === "samples" ? "Проверить примеры" : "Отправить решение" }));
  expect(screen.getByLabelText("Код решения")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Отправить решение" })).toBeDisabled();
  await waitFor(() => expect(result).toHaveBeenCalledTimes(1));
});

test("сетевой повтор сохраняет ключ, новый режим получает другой ключ", async () => {
  const nextKey = "44444444-4444-4444-8444-444444444444";
  const retry = vi.fn(() => ({ data: { submitITTaskCode: { ...completedCodeSubmission, verdict: "accepted" } } }));
  const graded = actionMock("graded");
  graded.request.variables!.input.idempotencyKey = nextKey;
  const user = renderActions([
    actionMock("samples", { result: undefined, error: new Error("private network details") }),
    actionMock("samples", { result: retry }), graded,
  ]);
  vi.mocked(crypto.randomUUID).mockReturnValueOnce(attemptKey).mockReturnValue(nextKey);
  await user.type(screen.getByLabelText("Код решения"), "print(input())");
  await user.click(screen.getByRole("button", { name: "Проверить примеры" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  expect(screen.queryByText("private network details")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Проверить примеры" }));
  expect(await screen.findByText("✓ Примеры пройдены")).toBeInTheDocument();
  expect(retry).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Отправить решение" }));
  expect(await screen.findByText("Общий результат проверки закрытых тестов")).toBeInTheDocument();
  expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
});

test("graded скрывает кейсы, вывод фаз и техническую ошибку даже в некорректном ответе", () => {
  const privateOutput = "PRIVATE_TEST_CANARY";
  render(<CodeSubmissionResult examples={[]} submission={{ ...completedCodeSubmission,
    runMode: "graded", compilation: { ...completedCodeSubmission.execution, stdout: privateOutput },
    execution: { ...completedCodeSubmission.execution, stderr: privateOutput },
    tests: [{ ...completedCodeSubmission.tests[0], stdout: privateOutput }],
    failure: { code: "PRIVATE_CODE", message: privateOutput },
  } as ITCodeSubmission} />);
  expect(screen.getByText("Общий результат проверки закрытых тестов")).toBeInTheDocument();
  expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Тест/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/из .* тестов прошло/)).not.toBeInTheDocument();
});

test("Go-файл отправляется в graded", async () => {
  const file = new File(["package main\nfunc main() {}"], "main.go", { type: "text/plain" });
  const result = vi.fn(() => ({ data: { submitITTaskCode: { ...completedCodeSubmission, runMode: "graded", language: "go" } } }));
  const user = renderActions([{
    request: { query: SUBMIT_IT_TASK_CODE, variables: { taskId: programmingTask.id, input: {
      taskVersionId: programmingTask.taskVersionId, idempotencyKey: attemptKey,
      runMode: "graded", language: "go", file,
    } } }, result,
  }]);
  await user.selectOptions(screen.getByLabelText("Язык программирования"), "go");
  await user.click(screen.getByRole("tab", { name: "Загрузить файл" }));
  await user.upload(screen.getByLabelText(/Выберите файл решения/), file);
  await user.click(screen.getByRole("button", { name: "Отправить решение" }));
  await waitFor(() => expect(result).toHaveBeenCalledTimes(1));
});

test.each(["samples", "graded"] as const)("история %s правильно определяет прогресс", async (runMode) => {
  function Status() {
    const { stats } = useTaskSolveStatus(programmingTask.id, true);
    return <span>{stats?.status ?? "loading"}</span>;
  }
  render(<MockedProvider addTypename={false} mocks={[
    { request: { query: MY_IT_SUBMISSIONS_QUERY, variables: { taskId: programmingTask.id, pagination: { limit: 100, offset: 0 } } }, result: { data: { myITSubmissions: { items: [], limit: 100, offset: 0 } } } },
    { request: { query: MY_IT_CODE_SUBMISSIONS_QUERY, variables: { taskId: programmingTask.id, pagination: { limit: 100, offset: 0 } } }, result: { data: { myITCodeSubmissions: { items: [{ ...completedCodeSubmission, runMode, verdict: "accepted" }], limit: 100, offset: 0 } } } },
  ]}><Status /></MockedProvider>);
  expect(await screen.findByText(runMode === "samples" ? "none" : "solved")).toBeInTheDocument();
});

import { ProgrammingTaskSolve, CodeSubmissionResult } from "./ProgrammingTaskSolve";
import { useTaskSolveStatus } from "./useTaskSolveStatus";


test("polling завершает graded и новая попытка получает новый ключ", async () => {
  const nextKey = "55555555-5555-4555-8555-555555555555";
  const second = actionMock("graded");
  second.request.variables!.input.idempotencyKey = nextKey;
  const user = renderActions([
    actionMock("graded", { result: { data: { submitITTaskCode: { ...completedCodeSubmission, runMode: "graded", status: "queued", verdict: null, tests: [] } } } }),
    { request: { query: IT_CODE_SUBMISSION_QUERY, variables: { id: completedCodeSubmission.id } }, delay: 50,
      result: { data: { itCodeSubmission: { ...completedCodeSubmission, runMode: "graded", verdict: "accepted" } } } },
    second,
  ]);
  vi.mocked(crypto.randomUUID).mockReturnValueOnce(attemptKey).mockReturnValue(nextKey);
  await user.type(screen.getByLabelText("Код решения"), "print(input())");
  await user.click(screen.getByRole("button", { name: "Отправить решение" }));
  expect(await screen.findByText("Решение поставлено в очередь…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Проверить примеры" })).toBeDisabled();
  expect(await screen.findByText("✓ Решение принято")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Отправить решение" }));
  expect(await screen.findByText("✗ Неверный ответ")).toBeInTheDocument();
  expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
});


test("сто samples не вытесняют принятое решение со следующей страницы истории", async () => {
  function Status() {
    const { stats } = useTaskSolveStatus(programmingTask.id, true);
    return <span>{stats?.status ?? "loading"}</span>;
  }
  const variables = { taskId: programmingTask.id, pagination: { limit: 100, offset: 0 } };
  render(<MockedProvider addTypename={false} mocks={[
    { request: { query: MY_IT_SUBMISSIONS_QUERY, variables }, result: { data: { myITSubmissions: { items: [], limit: 100, offset: 0 } } } },
    { request: { query: MY_IT_CODE_SUBMISSIONS_QUERY, variables }, result: { data: { myITCodeSubmissions: {
      items: Array.from({ length: 100 }, (_, i) => ({ ...completedCodeSubmission, id: `sample-${i}`, runMode: "samples" })), limit: 100, offset: 0,
    } } } },
    { request: { query: MY_IT_CODE_SUBMISSIONS_QUERY, variables: { ...variables, pagination: { limit: 100, offset: 100 } } }, result: { data: { myITCodeSubmissions: {
      items: [{ ...completedCodeSubmission, runMode: "graded", verdict: "accepted" }], limit: 100, offset: 100,
    } } } },
  ]}><Status /></MockedProvider>);
  expect(await screen.findByText("solved")).toBeInTheDocument();
});

test.each([
  ["queued", null, "pending"],
  ["completed", "infrastructure_error", "unavailable"],
  ["completed", "checker_error", "unavailable"],
] as const)("история %s/%s не показывает ложный неверный ответ", async (status, verdict, expected) => {
  function Status() {
    const { stats } = useTaskSolveStatus(programmingTask.id, true);
    return <span>{stats?.status ?? "loading"}</span>;
  }
  render(<MockedProvider addTypename={false} mocks={[
    { request: { query: MY_IT_SUBMISSIONS_QUERY, variables: { taskId: programmingTask.id, pagination: { limit: 100, offset: 0 } } }, result: { data: { myITSubmissions: { items: [], limit: 100, offset: 0 } } } },
    { request: { query: MY_IT_CODE_SUBMISSIONS_QUERY, variables: { taskId: programmingTask.id, pagination: { limit: 100, offset: 0 } } }, result: { data: { myITCodeSubmissions: { items: [{ ...completedCodeSubmission, runMode: "graded", status, verdict }], limit: 100, offset: 0 } } } },
  ]}><Status /></MockedProvider>);
  expect(await screen.findByText(expected)).toBeInTheDocument();
});

test("восстановленный terminal обновляет баннер очереди", async () => {
  localStorage.setItem("overmindv:pending-code:user-id:programming-id:programming-version-id", JSON.stringify({
    id: completedCodeSubmission.id, runMode: "graded", startedAt: Date.now(),
  }));
  render(<MockedProvider addTypename={false} mocks={[
    meMock(),
    { request: { query: IT_TASK_QUERY, variables: { id: programmingTask.id } }, result: { data: { itTask: programmingTask } } },
    { request: { query: MY_IT_SUBMISSIONS_QUERY, variables: { taskId: programmingTask.id, pagination: { limit: 100, offset: 0 } } }, result: { data: { myITSubmissions: { items: [], limit: 100, offset: 0 } } } },
    { request: { query: MY_IT_CODE_SUBMISSIONS_QUERY, variables: { taskId: programmingTask.id, pagination: { limit: 100, offset: 0 } } }, result: { data: { myITCodeSubmissions: { items: [{ ...completedCodeSubmission, runMode: "graded", status: "queued", verdict: null }], limit: 100, offset: 0 } } } },
    { request: { query: IT_CODE_SUBMISSION_QUERY, variables: { id: completedCodeSubmission.id } }, delay: 100, result: { data: { itCodeSubmission: { ...completedCodeSubmission, runMode: "graded", status: "completed", verdict: "accepted" } } } },
  ]}><MemoryRouter initialEntries={[`/tasks/${programmingTask.id}`]}><AuthProvider><Routes><Route path="/tasks/:id" element={<TaskSolvePage />} /></Routes></AuthProvider></MemoryRouter></MockedProvider>);
  expect(await screen.findByText("Решение ожидает проверки")).toBeInTheDocument();
  expect(await screen.findByText("Решена правильно")).toBeInTheDocument();
  expect(screen.queryByText("Решение ожидает проверки")).not.toBeInTheDocument();
});

test("ошибка подготовки исходника показывает нейтральное сообщение", async () => {
  vi.spyOn(crypto.subtle, "digest").mockRejectedValueOnce(new Error("private filesystem detail"));
  const user = userEvent.setup();
  render(<MockedProvider mocks={[]}><MemoryRouter><ProgrammingTaskSolve task={programmingTask as ITTask} isAuthenticated userId="user-id" /></MemoryRouter></MockedProvider>);
  await user.type(screen.getByLabelText("Код решения"), "print(4)");
  await user.click(screen.getByRole("button", { name: "Отправить решение" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось выполнить действие. Попробуйте ещё раз.");
  expect(screen.queryByText("private filesystem detail")).not.toBeInTheDocument();
});
