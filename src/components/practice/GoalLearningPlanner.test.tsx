import { SAVE_PLAN } from "../../api/savedPlans";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { GoalLearningPlanner, LEARNING_PLAN_QUERY, type GoalPlan } from "./GoalLearningPlanner";
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ isAdmin: false }) }));
const result: GoalPlan = { aiStatus: "GENERATED", warnings: [], topics: [{ id: "1", title: "Python" }], materials: [{ id: "python", title: "Python tutorial", url: "https://docs.python.org/3/tutorial/", action: "Напишите функцию", minutes: 25 }], practice: { topicInsights: [], warnings: [], totalPlannedMinutes: 10, sessions: [{ number: 1, totalMinutes: 10, items: [{ taskId: "task", title: "Списки", estimatedMinutes: 10 }] }] } };
function show(plan = result, delay = 0, extra: MockedResponse[] = []) {
  return render(<MockedProvider mocks={[{ request: { query: LEARNING_PLAN_QUERY, variables: { goal: "Junior AI", minutes: 60, sessionCount: 3 } }, result: { data: { learningPlan: plan } }, delay }, ...extra]}><MemoryRouter><GoalLearningPlanner /></MemoryRouter></MockedProvider>);
}
test("цель без тем даёт реальные материалы и практику", async () => {
  show(); const user = userEvent.setup();
  await user.type(screen.getByLabelText("Что хотите освоить?"), "Junior AI");
  await user.click(screen.getByRole("button", { name: "Построить учебный план" }));
  expect(await screen.findByRole("link", { name: "Python tutorial" })).toHaveAttribute("href", "https://docs.python.org/3/tutorial/");
  expect(screen.getByRole("link", { name: "Списки" })).toHaveAttribute("href", "/tasks/task");
  expect(screen.getByText("Напишите функцию")).toBeInTheDocument();
});
test("недоступность AI не маскируется под успешный план", async () => {
  show({ ...result, aiStatus: "UNAVAILABLE", topics: [], materials: [], practice: null }); const user = userEvent.setup();
  await user.type(screen.getByLabelText("Что хотите освоить?"), "Junior AI");
  await user.click(screen.getByRole("button", { name: "Построить учебный план" }));
  expect(await screen.findByText(/AI сейчас недоступен/)).toBeInTheDocument();
  expect(screen.queryByText("Ваш учебный маршрут")).not.toBeInTheDocument();
});
test("изменение цели скрывает готовый результат", async () => {
  show(); const user = userEvent.setup();
  await user.type(screen.getByLabelText("Что хотите освоить?"), "Junior AI");
  await user.click(screen.getByRole("button", { name: "Построить учебный план" }));
  await screen.findByText("Ваш учебный маршрут");
  await user.type(screen.getByLabelText("Что хотите освоить?"), " Python");
  expect(screen.queryByText("Ваш учебный маршрут")).not.toBeInTheDocument();
});

test("нехватка практики по одной теме видна при непустом плане", async () => {
 show({ ...result, practice: { ...result.practice!, topicInsights: [{ topicId: "nlp", title: "NLP", isTarget: true, nextAction: "ADD_CONTENT", plannedTasks: 0 }] } });
 const user=userEvent.setup();
 await user.type(screen.getByLabelText("Что хотите освоить?"),"Junior AI");
 await user.click(screen.getByRole("button",{name:"Построить учебный план"}));
 expect(await screen.findByText(/В каталоге пока нет задач по этой теме/)).toBeInTheDocument();
 expect(screen.getByRole("link",{name:"Списки"})).toBeInTheDocument();
});

test("NO_MATCH сохраняет предупреждение об усечённом каталоге", async () => {
  show({ ...result, aiStatus: "NO_MATCH", warnings: ["PARTIAL_CATALOG"], topics: [], materials: [], practice: null });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Что хотите освоить?"), "Junior AI");
  await user.click(screen.getByRole("button", { name: "Построить учебный план" }));
  expect(await screen.findByText("Каталог большой: AI видел только часть тем.")).toBeInTheDocument();
});

test("сохранение блокирует изменение цели до ответа",async()=>{
 const key="00000000-0000-4000-8000-000000000001";vi.spyOn(crypto,"randomUUID").mockReturnValue(key);
 show(result,0,[{request:{query:SAVE_PLAN,variables:{goal:"Junior AI",minutes:60,sessionCount:3,requestId:key}},result:{data:{saveLearningPlan:{id:key}}},delay:100}]);
 const user=userEvent.setup();await user.type(screen.getByLabelText("Что хотите освоить?"),"Junior AI");
 await user.click(screen.getByRole("button",{name:"Построить учебный план"}));await screen.findByText("Ваш учебный маршрут");
 await user.click(screen.getByRole("button",{name:"Сохранить план"}));
 expect(screen.getByLabelText("Что хотите освоить?")).toBeDisabled();
 expect(screen.getByRole("button",{name:"Построить учебный план"})).toBeDisabled();
 await waitFor(()=>expect(screen.getByLabelText("Что хотите освоить?")).toBeEnabled());vi.restoreAllMocks();
});
