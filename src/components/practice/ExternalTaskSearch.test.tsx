import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ExternalTaskSearch, EXTERNAL_TASK_SEARCH, IMPORT_EXTERNAL_TASK } from "./ExternalTaskSearch";

test("внешний результат импортируется через очередь, не публикуется", async () => {
  const key = "00000000-0000-4000-8000-000000000001";
  vi.spyOn(crypto, "randomUUID").mockReturnValue(key);
  const url = "https://codeforces.com/problemset/problem/1/A";
  render(<MockedProvider mocks={[
    { request: { query: EXTERNAL_TASK_SEARCH, variables: { query: "graphs" } }, result: { data: { externalTaskSearch: [{ title: "Graph task", url, rating: 800, tags: ["graphs"] }] } } },
    { request: { query: IMPORT_EXTERNAL_TASK, variables: { input: { idempotencyKey: key, websiteUrls: [url], telegramChannels: [], maxItemsPerSource: 1 } } }, result: { data: { startTaskCollection: { id: "job", status: "queued" } } } },
  ]}><MemoryRouter><ExternalTaskSearch /></MemoryRouter></MockedProvider>);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Название или тег задачи"), "graphs");
  await user.click(screen.getByRole("button", { name: "Найти во внешнем каталоге" }));
  expect(await screen.findByRole("link", { name: "Graph task" })).toHaveAttribute("href", url);
  await user.click(screen.getByRole("button", { name: "Добавить в очередь модерации" }));
  expect(await screen.findByRole("link", { name: "Открыть импорт" })).toHaveAttribute("href", "/admin/collected-tasks?job=job");
  vi.restoreAllMocks();
});
