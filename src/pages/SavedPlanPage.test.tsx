import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { GraphQLError } from "graphql";
import { SavedPlanPage } from "./SavedPlanPage";
import { SAVED_PLAN, MARK_MATERIAL, CLONE_PLAN } from "../api/savedPlans";
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ isLoading: false, userId: "me", isAuthenticated: true }) }));
const plan = { __typename: "SavedLearningPlan", id: "plan", goal: "Junior AI", isOwner: true, public: false, revision: 1, minutes: 60, sessionCount: 3, progressAvailable: true,
 materials: [{ id: "python", title: "Python", url: "https://docs.python.org/3/tutorial/", action: "Напишите функцию", minutes: 25, status: "TODO" }], tasks: [{ id: "task", versionId: "version", title: "Списки", minutes: 10, completed: true, completionVersionId: "version" }] };
function show(value = plan, mocks: MockedResponse[] = []) { return render(<MockedProvider mocks={[{ request: { query: SAVED_PLAN, variables: { id: "plan" } }, result: { data: { savedLearningPlan: value } } }, ...mocks]}><MemoryRouter initialEntries={["/plans/plan"]}><Routes><Route path="/plans/:id" element={<SavedPlanPage />} /><Route path="/plans/copy" element={<p>Моя копия</p>} /></Routes></MemoryRouter></MockedProvider>); }
test("владелец видит честный прогресс и сохраняет отметку", async () => {
 show(plan, [{ request: { query: MARK_MATERIAL, variables: { id: "plan", revision: 1, materialId: "python", status: "DONE" } }, result: { data: { updateLearningMaterial: { ...plan, revision: 2, materials: [{ ...plan.materials[0], status: "DONE" }] } } } }]);
 expect(await screen.findByText("50%")).toBeInTheDocument();
 const user = userEvent.setup();await user.selectOptions(screen.getByLabelText("Статус: Python"), "DONE");
 expect(await screen.findByText("100%")).toBeInTheDocument();
 expect(screen.getByText("Решено")).toBeInTheDocument();
});
test("публичный план не показывает отметки и копируется отдельно", async () => {
 const key="00000000-0000-4000-8000-000000000001";vi.spyOn(crypto,"randomUUID").mockReturnValue(key);
 show({ ...plan,isOwner:false,public:true,progressAvailable:false },[{request:{query:CLONE_PLAN,variables:{id:"plan",requestId:key}},result:{data:{cloneLearningPlan:{id:"copy"}}}}]);
 await screen.findByRole("heading",{name:"Junior AI"});
 expect(screen.queryByLabelText("Прогресс плана")).not.toBeInTheDocument();
 expect(screen.queryByLabelText("Статус: Python")).not.toBeInTheDocument();
 await userEvent.setup().click(screen.getByRole("button",{name:"Скопировать себе"}));
 expect(await screen.findByText("Моя копия")).toBeInTheDocument();vi.restoreAllMocks();
});
test("конфликт версии не подменяет сохранённую отметку", async () => {
 show(plan,[{request:{query:MARK_MATERIAL,variables:{id:"plan",revision:1,materialId:"python",status:"DONE"}},result:{errors:[new GraphQLError("Conflict",{extensions:{code:"CONFLICT"}})]}}]);
 await screen.findByText("50%");await userEvent.setup().selectOptions(screen.getByLabelText("Статус: Python"),"DONE");
 expect(await screen.findByText(/План изменён в другом окне/)).toBeInTheDocument();expect(screen.getByLabelText("Статус: Python")).toHaveValue("TODO");
});
test("сбой истории не отображает нулевой процент", async () => {
 show({...plan,progressAvailable:false});await screen.findByRole("heading",{name:"Junior AI"});
 expect(screen.getByText(/не удалось проверить/)).toBeInTheDocument();expect(screen.queryByText("0%")).not.toBeInTheDocument();
});

test("успех другой версии отмечен явно",async()=>{
 show({...plan,tasks:[{...plan.tasks[0],completionVersionId:"new-version"}]});
 expect(await screen.findByText("Решено в другой версии")).toBeInTheDocument();
});
