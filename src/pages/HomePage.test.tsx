import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IT_TASKS_QUERY } from "../api/tasks";
import { HomePage } from "./HomePage";

test("главная показывает задачи и честную заглушку ленты", async () => {
  render(<MockedProvider mocks={[{ request: { query: IT_TASKS_QUERY, variables: { filter: {}, pagination: { limit: 8, offset: 0 } } }, result: { data: { itTasks: { __typename: "ITTaskList", items: [{ __typename: "ITTaskSummary", id: "task-1", status: "published", taskVersionId: "version-1", versionNumber: 1, topicId: null, title: "Два указателя", taskType: "programming", difficulty: "medium", createdAt: "2026-08-17T10:00:00Z", updatedAt: "2026-08-17T10:00:00Z" }], limit: 8, offset: 0 } } } }]}><MemoryRouter><HomePage /></MemoryRouter></MockedProvider>);

  expect(await screen.findByText("Два указателя")).toBeInTheDocument();
  expect(screen.getByText("Лента готовится")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Университеты/ })).toHaveAttribute("href", "/universities");
});
