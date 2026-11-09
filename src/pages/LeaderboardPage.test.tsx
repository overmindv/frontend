import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PRACTICE_LEADERBOARD_QUERY, RATING_COURSES_QUERY } from "../api/progress";
import { AuthProvider } from "../context/AuthContext";
import { meMock } from "../test/authMocks";
import { LeaderboardPage } from "./LeaderboardPage";

test("рейтинг переключается с общего на курсный и показывает формулу", async () => {
  const courseId = "00000000-0000-4000-8000-000000000021";
  render(<MockedProvider mocks={[meMock(),
    { request: { query: PRACTICE_LEADERBOARD_QUERY, variables: { courseId: null } }, result: { data: { practiceLeaderboard: [
      { __typename: "PracticeLeaderboardEntry", rank: 1, userId: "peer-1", username: "anna", displayName: "Анна", score: 50, solvedTasks: 3 },
    ] } } },
    { request: { query: RATING_COURSES_QUERY, variables: { search: "" } }, result: { data: { courses: [{ __typename: "Course", id: courseId, name: "Алгоритмы", status: "active" }] } } },
    { request: { query: PRACTICE_LEADERBOARD_QUERY, variables: { courseId } }, result: { data: { practiceLeaderboard: [
      { __typename: "PracticeLeaderboardEntry", rank: 1, userId: "peer-1", username: "anna", displayName: "Анна", score: 20, solvedTasks: 1 },
    ] } } },
  ]}><MemoryRouter><AuthProvider><LeaderboardPage /></AuthProvider></MemoryRouter></MockedProvider>);
  expect(await screen.findByRole("link", { name: /Анна/ })).toHaveAttribute("href", "/users/peer-1");
  expect(screen.getByText(/10 за начальную/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "По курсу" }));
  await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Курс" }), courseId);
  expect(await screen.findByText("20")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Сравнить/ })).toHaveAttribute("href", "/compare/peer-1");
});
