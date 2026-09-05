import { MockedProvider } from "@apollo/client/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { TOKEN_STORAGE_KEY, USER_ID_STORAGE_KEY } from "../../api/client";
import { IT_TASK_QUERY, SUBMIT_IT_TASK_CODE } from "../../api/tasks";
import { AuthProvider } from "../../context/AuthContext";
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
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(USER_ID_STORAGE_KEY, "user-id");
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("33333333-3333-4333-8333-333333333333");

  const sourceFile = new File(["print(4)"], "solution.py", { type: "text/x-python" });

  return {
    sourceFile,
    user: userEvent.setup(),
    view: render(
      <MockedProvider
        addTypename={false}
        mocks={[
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
  await user.click(screen.getByRole("button", { name: "Отправить на проверку" }));

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
  await user.click(screen.getByRole("button", { name: "Отправить на проверку" }));

  // Результат sandbox отображается после ответа мутации с sourceCode.
  expect(await screen.findByText("1 из 2 тестов прошло")).toBeInTheDocument();
});
