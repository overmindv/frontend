import { ApolloLink, Observable, gql } from "@apollo/client";
import { MockLink, MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { Header } from "../components/common/Header";
import { AppRoutes } from "../routes";
import { DELETE_PRACTICE_GOAL_MUTATION, PRACTICE_GOAL_QUERY, SAVE_PRACTICE_GOAL_MUTATION, PRACTICE_PLAN_QUERY } from "../api/practice";
import { meMock } from "../test/authMocks";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
});
afterEach(() => vi.unstubAllGlobals());

const planQuery = PRACTICE_PLAN_QUERY;
const topicsQuery = gql`query PracticeTopics($search: String!, $limit: Int!, $offset: Int!) {
  topics(filter: { search: $search, status: active }, pagination: { limit: $limit, offset: $offset }) {
    id title status
  }
}`;
const topics = Array.from({ length: 6 }, (_, index) => ({
  __typename: "Topic", id: `topic-${index}`, courseId: null, parentTopicId: null,
  title: `Тема ${index + 1}`, slug: `topic-${index}`, description: "", orderIndex: index,
  difficulty: "easy", status: "active", createdAt: "2026-11-08", updatedAt: "2026-11-08",
}));
const topicsMock = (items = topics, search = "", offset = 0): MockedResponse => ({
  request: { query: topicsQuery, variables: { search, limit: 21, offset } },
  result: { data: { topics: items } },
});
const plan = {
  __typename: "PracticePlan", aiStatus: "NOT_REQUESTED", policyVersion: "practice-v3", requestedSessions: 3, totalPlannedMinutes: 10, sessions: [], topicInsights: [], totalMinutes: 10, warnings: [],
  items: [{ __typename: "PracticePlanItem", taskId: "task-1", taskVersionId: "version-1",
    topicId: "topic-0", title: "Два указателя", difficulty: "easy", taskType: "single_choice",
    estimatedMinutes: 10, reasonCode: "START_TOPIC" }],
};
const planMock = (overrides: Partial<MockedResponse> = {}): MockedResponse => ({
  request: { query: planQuery, variables: { topicIds: ["topic-0"], minutes: 60, sessionCount: 3 } },
  result: { data: { practicePlan: plan } }, ...overrides,
});
const goal = {
  __typename: "PracticeGoal", topics: [{ __typename: "PracticeGoalTopic", id: "topic-0", title: "Тема 1", status: "active" }],
  minutes: 60, sessionCount: 3, revision: 1,
};
const goalMock = (saved: typeof goal | null = null): MockedResponse => ({
  request: { query: PRACTICE_GOAL_QUERY }, result: { data: { myPracticeGoal: saved } },
});
function show(mocks: MockedResponse[] = [], authenticated = true, link?: ApolloLink) {
  const goalMocks = mocks.some((mock) => mock.request.query === PRACTICE_GOAL_QUERY) ? [] : [goalMock()];
  return render(<MockedProvider link={link} mocks={[meMock(authenticated ? undefined : null), ...goalMocks, ...mocks]}>
    <MemoryRouter initialEntries={["/practice"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><ThemeProvider>
      <Header /><AppRoutes />
    </ThemeProvider></AuthProvider></MemoryRouter>
  </MockedProvider>);
}

function deferredGoal(saved: typeof goal | null, mocks: MockedResponse[] = []) {
  let deliver: (() => void) | undefined;
  const link = ApolloLink.from([
    new ApolloLink((operation, forward) => {
      if (operation.operationName !== "MyPracticeGoal") return forward(operation);
      return new Observable((observer) => {
        deliver = () => {
          observer.next({ data: { myPracticeGoal: saved } });
          observer.complete();
        };
      });
    }),
    new MockLink([meMock(), ...mocks]),
  ]);
  return { link, release: () => {
    if (!deliver) throw new Error("Goal query has not started");
    deliver();
  } };
}

test("сохранённая цель загружает актуальную подборку при возвращении", async () => {
  show([goalMock(goal), topicsMock(), planMock()]);
  expect(await screen.findByText("Цель сохранена. При возвращении подборка обновится по вашим решениям.")).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: "Два указателя" })).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Тема 1" })).toBeChecked();
});

test("недоступную тему сохранённой цели можно убрать без запуска подборки", async () => {
  show([goalMock({ ...goal, topics: [{ ...goal.topics[0], status: "archived" }] }), topicsMock()]);
  expect(await screen.findByRole("button", { name: "Убрать тему Тема 1" })).toBeInTheDocument();
  expect(screen.getByText(/Сохранённая тема больше недоступна/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Подобрать практику" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Убрать тему Тема 1" }));
  expect(screen.queryByRole("button", { name: "Убрать тему Тема 1" })).not.toBeInTheDocument();
});

test("поздняя загрузка цели не заменяет ручной выбор", async () => {
  const deferred = deferredGoal({ ...goal, topics: [{ ...goal.topics[0], id: "topic-1", title: "Тема 2" }] }, [topicsMock()]);
  show([], true, deferred.link);
  await selectTopic();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Время на практику, минут" }), { target: { value: "30" } });
  await act(async () => deferred.release());
  expect(screen.getByRole("checkbox", { name: "Тема 1" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Тема 2" })).not.toBeChecked();
  expect(screen.getByRole("spinbutton", { name: "Время на практику, минут" })).toHaveValue(30);
});

test("поздняя загрузка старой цели не отменяет новое сохранение", async () => {
  const deferred = deferredGoal(null, [topicsMock(), {
    request: { query: SAVE_PRACTICE_GOAL_MUTATION, variables: { topicIds: ["topic-0"], minutes: 60, sessionCount: 3 } },
    result: { data: { savePracticeGoal: goal } },
  }]);
  show([], true, deferred.link);
  await selectTopic();
  await userEvent.click(screen.getByRole("button", { name: "Сохранить цель" }));
  expect(await screen.findByRole("button", { name: "Удалить сохранённую цель" })).toBeInTheDocument();
  await act(async () => deferred.release());
  expect(screen.getByRole("button", { name: "Удалить сохранённую цель" })).toBeInTheDocument();
  expect(screen.getByText("Цель сохранена. При возвращении подборка обновится по вашим решениям.")).toBeInTheDocument();
});

test("студент сохраняет и удаляет цель", async () => {
  show([topicsMock(), {
    request: { query: SAVE_PRACTICE_GOAL_MUTATION, variables: { topicIds: ["topic-0"], minutes: 60, sessionCount: 3 } },
    result: { data: { savePracticeGoal: goal } },
  }, {
    request: { query: DELETE_PRACTICE_GOAL_MUTATION }, result: { data: { deletePracticeGoal: true } },
  }]);
  await selectTopic();
  await userEvent.click(screen.getByRole("button", { name: "Сохранить цель" }));
  expect(await screen.findByText("Цель сохранена. При возвращении подборка обновится по вашим решениям.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Удалить сохранённую цель" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Удалить сохранённую цель" })).not.toBeInTheDocument());
});
async function selectTopic() {
  await userEvent.click(await screen.findByRole("checkbox", { name: "Тема 1" }));
}

test("страница доступна из личной навигации после входа", async () => {
  show([topicsMock()]);
  expect(await screen.findByRole("heading", { name: "Индивидуальный план" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Практика" })).toHaveAttribute("href", "/practice");
});

test("гость перенаправляется на вход без личной навигации", async () => {
  show([], false);
  expect(await screen.findByRole("heading", { name: /Вход/ })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Практика" })).not.toBeInTheDocument();
});

test("выбор ограничен пятью активными темами", async () => {
  show([topicsMock([...topics, { ...topics[0], id: "hidden", title: "Скрытая", status: "hidden" }])]);
  const button = await screen.findByRole("button", { name: "Подобрать практику" });
  expect(button).toBeDisabled();
  await selectTopic();
  for (let index = 2; index <= 5; index++) await userEvent.click(screen.getByRole("checkbox", { name: `Тема ${index}` }));
  expect(screen.getByRole("checkbox", { name: "Тема 6" })).toBeDisabled();
  expect(screen.queryByRole("checkbox", { name: "Скрытая" })).not.toBeInTheDocument();
  expect(button).toBeEnabled();
});

test.each(["", "9", "241", "10.5"])("бюджет %s не позволяет отправить запрос", async (value) => {
  show([topicsMock()]);
  await selectTopic();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Время на практику, минут" }), { target: { value } });
  expect(screen.getByRole("button", { name: "Подобрать практику" })).toBeDisabled();
});

test("запрос выполняется по кнопке, результат объясняет время и открывает задачу", async () => {
  show([topicsMock(), planMock({ delay: 50 })]);
  await selectTopic();
  expect(screen.queryByText("Два указателя")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Подобрать практику" }));
  expect(screen.getByRole("status")).toHaveTextContent("Подбираем практику");
  expect(await screen.findByRole("link", { name: /Два указателя/ })).toHaveAttribute("href", "/tasks/task-1");
  expect(screen.getByText(/10 из 60 минут/)).toBeInTheDocument();
  expect(screen.getByText(/Время приблизительное/)).toBeInTheDocument();
  expect(screen.getByText(/Начните знакомство с темой/)).toBeInTheDocument();
});

test("изменение формы скрывает результат и не возвращает старый ответ запроса", async () => {
  show([topicsMock(), planMock({ delay: 150 }), planMock({
    request: { query: planQuery, variables: { topicIds: ["topic-0"], minutes: 30, sessionCount: 3 } },
    result: { data: { practicePlan: { ...plan, items: [{ ...plan.items[0], title: "Новая подборка" }] } } },
  })]);
  await selectTopic();
  await userEvent.click(screen.getByRole("button", { name: "Подобрать практику" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "Время на практику, минут" }), { target: { value: "30" } });
  await userEvent.click(screen.getByRole("button", { name: "Подобрать практику" }));
  expect(await screen.findByText("Новая подборка")).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(screen.queryByText("Два указателя")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Время на практику, минут" }), { target: { value: "60" } });
  expect(screen.queryByText("Новая подборка")).not.toBeInTheDocument();
});

test("пересчёт получает новую историю вместо кешированной подборки", async () => {
  show([topicsMock(), planMock(), planMock({ result: { data: { practicePlan: { ...plan, items: [], totalMinutes: 0, warnings: ["NO_ELIGIBLE_TASKS"] } } } })]);
  await selectTopic();
  await userEvent.click(screen.getByRole("button", { name: "Подобрать практику" }));
  await screen.findByText("Два указателя");
  await userEvent.click(screen.getByRole("button", { name: "Пересчитать подборку" }));
  expect(await screen.findByText("Подходящих задач пока нет")).toBeInTheDocument();
  expect(screen.queryByText("Два указателя")).not.toBeInTheDocument();
});

test("ошибка сервиса обезличена и допускает повторный запрос", async () => {
  show([topicsMock(), planMock({ result: undefined, error: new Error("secret host database") }), planMock()]);
  await selectTopic();
  await userEvent.click(screen.getByRole("button", { name: "Подобрать практику" }));
  expect(await screen.findByRole("alert")).not.toHaveTextContent("secret");
  await userEvent.click(screen.getByRole("button", { name: "Подобрать практику" }));
  expect(await screen.findByText("Два указателя")).toBeInTheDocument();
});

test("предупреждения и причины объясняются без технических кодов", async () => {
  show([topicsMock(), planMock({ result: { data: { practicePlan: { ...plan,
    warnings: ["PARTIAL_DATA", "NO_ELIGIBLE_TASKS", "BUDGET_TOO_SMALL", "PREREQUISITE_GAP"],
    items: ["PRACTICE_GAP", "NEXT_CHALLENGE", "PREREQUISITE"].map((reasonCode, index) => ({ ...plan.items[0], taskId: `task-${index}`, reasonCode })),
  } } } })]);
  await selectTopic();
  await userEvent.click(screen.getByRole("button", { name: "Подобрать практику" }));
  expect(await screen.findByText(/Использована только часть/)).toBeInTheDocument();
  expect(screen.getByText(/Увеличьте время/)).toBeInTheDocument();
  expect(screen.getByText(/практики по базовым темам/)).toBeInTheDocument();
  expect(screen.getByText(/Закрепите тему после/)).toBeInTheDocument();
  expect(screen.getByText(/Следующий шаг практики/)).toBeInTheDocument();
  expect(screen.getByText(/Начните с необходимой базы/)).toBeInTheDocument();
  expect(screen.queryByText("PARTIAL_DATA")).not.toBeInTheDocument();
});

test("пустой каталог объясняется и не позволяет отправить запрос", async () => {
  show([topicsMock([])]);
  expect(await screen.findByText("Активных тем пока нет")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Подобрать практику" })).toBeDisabled();
});

test("ошибка каталога не раскрывает детали и позволяет загрузить темы заново", async () => {
  show([{ ...topicsMock(), result: undefined, error: new Error("secret catalog") }, topicsMock()]);
  expect(await screen.findByRole("alert")).not.toHaveTextContent("secret");
  await userEvent.click(screen.getByRole("button", { name: "Загрузить темы снова" }));
  await waitFor(() => expect(screen.getByRole("checkbox", { name: "Тема 1" })).toBeEnabled());
});


test("серверный фильтр и страницы позволяют выбрать тему после первых 50", async () => {
  const allTopics = Array.from({ length: 61 }, (_, index) => ({ ...topics[0], id: `topic-${index}`, title: `Тема ${index + 1}` }));
  show([
    topicsMock(allTopics.slice(0, 21)), topicsMock(allTopics.slice(20, 41), "", 20),
    topicsMock(allTopics.slice(40, 61), "", 40), topicsMock(allTopics.slice(60), "", 60),
    topicsMock([], "Несуществующая"),
    planMock({ request: { query: planQuery, variables: { topicIds: ["topic-0", "topic-60"], minutes: 60, sessionCount: 3 } } }),
  ]);
  await selectTopic();
  expect(screen.queryByRole("checkbox", { name: "Тема 21" })).not.toBeInTheDocument();
  for (const firstTopic of ["Тема 21", "Тема 41", "Тема 61"]) {
    await userEvent.click(screen.getByRole("button", { name: "Следующая страница тем" }));
    await screen.findByRole("checkbox", { name: firstTopic });
  }
  expect(screen.getByRole("button", { name: "Следующая страница тем" })).toBeDisabled();
  await userEvent.click(screen.getByRole("checkbox", { name: "Тема 61" }));
  expect(screen.getByRole("button", { name: "Убрать тему Тема 1" })).toBeInTheDocument();
  await userEvent.type(screen.getByRole("searchbox", { name: "Поиск активных тем" }), "Несуществующая");
  await userEvent.click(screen.getByRole("button", { name: "Найти темы" }));
  expect(await screen.findByText("По вашему запросу темы не найдены")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Предыдущая страница тем" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Убрать тему Тема 61" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Подобрать практику" }));
  expect(await screen.findByRole("link", { name: "Два указателя" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Убрать тему Тема 1" }));
  expect(screen.queryByRole("link", { name: "Два указателя" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Подобрать практику" })).toBeEnabled();
});

test("поиск не меняет выбранные темы и готовую подборку, Enter ищет темы", async () => {
  show([topicsMock(), planMock(), topicsMock([topics[1]], "Тема 2")]);
  await selectTopic();
  await userEvent.click(screen.getByRole("button", { name: "Подобрать практику" }));
  await screen.findByRole("link", { name: "Два указателя" });
  await userEvent.type(screen.getByRole("searchbox", { name: "Поиск активных тем" }), "Тема 2{Enter}");
  await screen.findByRole("checkbox", { name: "Тема 2" });
  await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Тема 1" })).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Убрать тему Тема 1" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Два указателя" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Пересчитать подборку" })).toBeEnabled();
});

test("горизонт сохраняется и маршрут объясняет недостающую базу", async () => {
  const route = { ...plan, requestedSessions: 3, totalPlannedMinutes: 30,
    sessions: [{ number: 1, totalMinutes: 10, items: plan.items }, { number: 2, totalMinutes: 20, items: [{ ...plan.items[0], taskId: "next", title: "Следующая задача" }] }],
    topicInsights: [{ topicId: "topic-0", title: "Тема 1", isTarget: true, acceptedTasks: 0, failedTasks: 1, eligibleTasks: 2, plannedTasks: 0, remainingToReadiness: 3, recommendedDifficulty: "easy", minimumMinutes: 10, nextAction: "COMPLETE_PREREQUISITES", blockedBy: [{ id: "base", title: "Базовые алгоритмы" }] }],
  };
  show([goalMock(goal), topicsMock(), planMock({ result: { data: { practicePlan: route } } })]);
  expect(await screen.findByText("Не хватает базы: Базовые алгоритмы.")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Занятий в плане" })).toHaveValue("3");
  expect(screen.getByRole("link", { name: "Начать первое занятие" })).toHaveAttribute("href", "/tasks/task-1");
  expect(screen.getByText(/Занятие 2/)).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Занятий в плане" }), "1");
  expect(screen.queryByText(/Не хватает базы:/)).not.toBeInTheDocument();
});


test.each(["GENERATED", "CACHED", "UNAVAILABLE"])("AI цель передаётся явно, статус %s отображается", async (status) => {
  const user = userEvent.setup();
  show([topicsMock(), planMock({
    request: { query: planQuery, variables: { topicIds: ["topic-0"], minutes: 60, sessionCount: 3, goal: "Junior AI" } },
    result: { data: { practicePlan: { ...plan, aiStatus: status } } },
  })]);
  await user.click(await screen.findByRole("checkbox", { name: "Тема 1" }));
  await user.type(screen.getByLabelText("Цель для AI (необязательно)"), "Junior AI");
  await user.click(screen.getByRole("button", { name: "Подобрать практику" }));
  expect(await screen.findByRole("link", { name: "Два указателя" })).toBeInTheDocument();
  if (status === "GENERATED") expect(screen.getByText("Порядок задач подобран AI по вашей цели.")).toBeInTheDocument();
  if (status === "CACHED") expect(screen.getByText("AI-план уже готов: цель и результаты не изменились.")).toBeInTheDocument();
  if (status === "UNAVAILABLE") expect(screen.getByText(/AI сейчас недоступен/)).toBeInTheDocument();
});
