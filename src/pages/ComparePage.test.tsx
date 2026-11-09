import { MockedProvider } from "@apollo/client/testing";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MY_PROGRESS_QUERY, USER_PROGRESS_QUERY } from "../api/progress";
import { PUBLIC_USER_QUERY } from "../api/queries";
import { ComparePage } from "./ComparePage";

const peer = "00000000-0000-4000-8000-000000000023";
const ownProgress = { __typename: "PracticeProgress", userId: "mine", public: false, attempts: 30, acceptedAttempts: 15, solvedTasks: 12, score: 210, accuracyPercent: 50, daily: [], byDifficulty: [] };
const peerProgress = { ...ownProgress, userId: peer, public: true, attempts: 40, acceptedAttempts: 25, solvedTasks: 20, score: 350, accuracyPercent: 63 };

function show(publicProgress: typeof peerProgress | null) {
  return render(<MockedProvider mocks={[
    { request: { query: MY_PROGRESS_QUERY }, result: { data: { myPracticeProgress: ownProgress } } },
    { request: { query: USER_PROGRESS_QUERY, variables: { userId: peer } }, result: { data: { practiceProgress: publicProgress } } },
    { request: { query: PUBLIC_USER_QUERY, variables: { id: peer } }, result: { data: { userProfile: {
      __typename: "PublicUser", id: peer, username: "anna", firstName: "Анна", lastName: "Петрова", avatar: null, isAdmin: false, createdAt: "2026-01-01",
    } } } },
  ]}><MemoryRouter initialEntries={[`/compare/${peer}`]}><Routes><Route path="/compare/:id" element={<ComparePage />} /></Routes></MemoryRouter></MockedProvider>);
}

test("сравнивает только сводки с одинаковыми метриками", async () => {
  show(peerProgress);
  const table = await screen.findByRole("table", { name: "Сравнение показателей" });
  expect(screen.getByRole("columnheader", { name: /Анна Петрова/ })).toBeInTheDocument();
  expect(within(table).getByText("350")).toBeInTheDocument();
  expect(within(table).getByText("210")).toBeInTheDocument();
});

test("закрытая статистика другого человека не подменяется нулями", async () => {
  show(null);
  expect(await screen.findByText("Статистика закрыта")).toBeInTheDocument();
  expect(screen.queryByRole("table", { name: "Сравнение показателей" })).not.toBeInTheDocument();
});
