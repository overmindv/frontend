import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FEED_QUERY } from "../api/feed";
import { IT_TASKS_QUERY } from "../api/tasks";
import { HomePage } from "./HomePage";

test("главная предлагает практику и обычный список задач без ложной персонализации", async () => {
  render(<MockedProvider mocks={[{ request: { query: IT_TASKS_QUERY, variables: { filter: {}, pagination: { limit: 8, offset: 0 } } }, result: { data: { itTasks: { __typename: "ITTaskList", items: [{ __typename: "ITTaskSummary", id: "task-1", status: "published", taskVersionId: "version-1", versionNumber: 1, topicId: null, title: "Два указателя", taskType: "programming", difficulty: "medium", createdAt: "2026-08-17T10:00:00Z", updatedAt: "2026-08-17T10:00:00Z" }], limit: 8, offset: 0 } } } }, { request: { query: FEED_QUERY, variables: { pagination: { limit: 8, offset: 0 } } }, result: { data: { feed: { __typename: "FeedConnection", items: [], limit: 8, offset: 0 } } } }]}><MemoryRouter><HomePage /></MemoryRouter></MockedProvider>);

  expect(await screen.findByText("Два указателя")).toBeInTheDocument();
  expect(screen.queryByText("Лента готовится")).not.toBeInTheDocument();
  expect(screen.queryByText("Задачи для вас")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Практика по темам" })).toHaveAttribute("href", "/practice");
  expect(screen.getByRole("link", { name: /Университеты/ })).toHaveAttribute("href", "/universities");
});


test("ошибка загрузки главной не выглядит как отсутствие задач", async () => {
  render(<MockedProvider mocks={[
    { request: { query: IT_TASKS_QUERY, variables: { filter: {}, pagination: { limit: 8, offset: 0 } } }, error: new Error("private detail") },
    { request: { query: FEED_QUERY, variables: { pagination: { limit: 8, offset: 0 } } }, result: { data: { feed: { items: [], limit: 8, offset: 0 } } } },
  ]}><MemoryRouter><HomePage /></MemoryRouter></MockedProvider>);
  await screen.findByRole("alert");
  expect(screen.queryByText("Задач пока нет")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
});
