import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MY_IT_CODE_SUBMISSIONS_QUERY, MY_IT_SUBMISSIONS_QUERY } from "../api/tasks";
import { MY_PROGRESS_QUERY, SET_PROGRESS_PUBLIC_MUTATION, USER_PROGRESS_QUERY } from "../api/progress";
import { GET_USER_QUERY, PUBLIC_USER_QUERY } from "../api/queries";
import { AuthProvider } from "../context/AuthContext";
import { meMock } from "../test/authMocks";
import { ProfilePage, PublicUserProfilePage } from "./ProfilePage";

const peerId = "00000000-0000-4000-8000-000000000023";
const profile = { __typename: "User", id: "user-id", email: "user@example.com", username: "learner", firstName: "Иван", lastName: "", birthDate: null, phone: null, avatar: null, roles: [], isAdmin: false, isSuperuser: false, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const peer = { __typename: "PublicUser", id: peerId, username: "anna", firstName: "Анна", lastName: "", avatar: null, isAdmin: false, createdAt: "2026-01-01" };
const progress = (visible: boolean) => ({ __typename: "PracticeProgress", userId: "user-id", public: visible, attempts: 6, acceptedAttempts: 3, solvedTasks: 2, score: 30, accuracyPercent: 50, daily: [], byDifficulty: [] });

function show(path: string, mocks: MockedResponse[]) {
  return render(<MockedProvider mocks={[meMock(), ...mocks]}><MemoryRouter initialEntries={[path]}><AuthProvider><Routes>
    <Route path="/profile" element={<ProfilePage />} /><Route path="/users/:id" element={<PublicUserProfilePage />} />
  </Routes></AuthProvider></MemoryRouter></MockedProvider>);
}

test("чужой закрытый профиль не показывает числа и сравнение", async () => {
  show(`/users/${peerId}`, [
    { request: { query: PUBLIC_USER_QUERY, variables: { id: peerId } }, result: { data: { userProfile: peer } } },
    { request: { query: USER_PROGRESS_QUERY, variables: { userId: peerId } }, result: { data: { practiceProgress: null } } },
  ]);
  expect(await screen.findByText("Статистика закрыта")).toBeInTheDocument();
  expect(screen.queryByText("30")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Сравнить с собой" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Поделиться статистикой" })).not.toBeInTheDocument();
});

test("владелец открывает статистику и получает ссылку для шаринга", async () => {
  show("/profile", [
    { request: { query: GET_USER_QUERY, variables: { id: "user-id" } }, result: { data: { getUser: profile } } },
    { request: { query: MY_IT_SUBMISSIONS_QUERY, variables: { taskId: null, pagination: { limit: 20, offset: 0 } } }, result: { data: { myITSubmissions: { items: [], limit: 20, offset: 0 } } } },
    { request: { query: MY_IT_CODE_SUBMISSIONS_QUERY, variables: { taskId: null, pagination: { limit: 20, offset: 0 } } }, result: { data: { myITCodeSubmissions: { items: [], limit: 20, offset: 0 } } } },
    { request: { query: MY_PROGRESS_QUERY }, result: { data: { myPracticeProgress: progress(false) } } },
    { request: { query: SET_PROGRESS_PUBLIC_MUTATION, variables: { public: true } }, result: { data: { setMyPracticeStatsPublic: true } } },
    { request: { query: MY_PROGRESS_QUERY }, result: { data: { myPracticeProgress: progress(true) } } },
  ]);
  expect(await screen.findByRole("button", { name: "Открыть статистику" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Поделиться статистикой" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Открыть статистику" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Поделиться статистикой" })).toBeInTheDocument());
});
