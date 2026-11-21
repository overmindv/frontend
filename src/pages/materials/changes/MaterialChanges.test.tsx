import { InMemoryCache } from "@apollo/client";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  APPEND_MATERIAL_CHANGE_MUTATION, CHANGE_AUTHOR_QUERY, CLOSE_MATERIAL_CHANGE_MUTATION, MATERIAL_CHANGE_DIFF_QUERY,
  MATERIAL_CHANGE_HISTORY_QUERY, MATERIAL_CHANGE_QUERY, OPEN_MATERIAL_CHANGE_MUTATION, type MaterialChange,
} from "../../../api/materialChanges";
import { PUBLISHED_MATERIAL_QUERY } from "../../../api/materials";
import MaterialChangeFormPage from "./MaterialChangeFormPage";
import MaterialChangePage from "./MaterialChangePage";
import { changeHref } from "./changeRoutes";

const idFor = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = idFor(51);
const visitor = idFor(52);
const id = idFor(53);
const materialId = idFor(54);
const baseRevisionId = idFor(55);
const headId = idFor(56);
const oldId = idFor(57);
const time = "2026-11-18T09:00:00Z";
const newRoute = `/materials/${materialId}/changes/new`;
const source = "# Очередь\n";
const revised = "# Очередь\n\nНовый пример\n";

const change: MaterialChange = {
  id, materialId, authorId: owner, baseRevisionId, status: "open", createdAt: time, baseOutdated: false,
  head: { id: headId, ordinal: 2, createdAt: time, message: "Уточнил пример" },
};

vi.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ userId: "00000000-0000-4000-8000-000000000051" }) }));

const makeRead = (value: MaterialChange = change, includeSource = false): MockedResponse => ({
  request: { query: MATERIAL_CHANGE_QUERY, variables: { id, includeSource } }, result: { data: { materialChangeProposal: value } },
});
const makeDiff = (revisionId: string, unifiedDiff = "", truncated = false): MockedResponse => ({
  request: { query: MATERIAL_CHANGE_DIFF_QUERY, variables: { id, revisionId } },
  result: { data: { materialChangeDiff: { baseRevisionId, revisionId, unifiedDiff, truncated } } },
});
const makeAuthor = (authorId = owner): MockedResponse => ({
  request: { query: CHANGE_AUTHOR_QUERY, variables: { id: authorId } },
  result: { data: { userProfile: { id: authorId, username: "author" } } },
});
const published: MockedResponse = {
  request: { query: PUBLISHED_MATERIAL_QUERY, variables: { id: materialId } },
  result: { data: { publishedMaterial: {
    id: materialId, title: "Графы", description: "", status: "published", authorId: visitor, publishedAt: time, publishedRevisionId: baseRevisionId,
    revision: { id: baseRevisionId, number: 4, format: "markdown", source }, attachments: [], learning: null,
  } } },
};

function show(mocks: MockedResponse[], initial = changeHref(id)) {
  const router = createMemoryRouter([
    { path: "/materials/:id/changes/new", element: <MaterialChangeFormPage /> },
    { path: "/materials/changes/:changeId/edit", element: <MaterialChangeFormPage /> },
    { path: "/materials/changes/:changeId", element: <MaterialChangePage /> },
  ], { initialEntries: [initial] });
  render(<MockedProvider mocks={mocks} addTypename={false} cache={new InMemoryCache({ addTypename: false })}>
    <RouterProvider router={router} />
  </MockedProvider>);
  return userEvent.setup();
}

describe("material proposals", () => {
  it("opens a proposal from the published revision only after changing text", async () => {
    const user = show([
      published,
      { request: { query: OPEN_MATERIAL_CHANGE_MUTATION, variables: { input: { materialId, baseRevisionId, source: revised, message: "" } } },
        result: { data: { openMaterialChange: { id } } } },
      makeRead(), makeAuthor(), makeDiff(headId),
    ], newRoute);
    const input = await screen.findByLabelText("Текст правки");
    expect(input).toHaveValue(source);
    expect(screen.getByText("Версия материала: 4")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Создать предложение" });
    expect(submit).toBeDisabled();
    await user.clear(input);
    await user.type(input, revised);
    await user.click(submit);
    expect(await screen.findByRole("heading", { name: "Предложение правки" })).toBeInTheDocument();
  });

  it("uses the expected head and keeps local edits after a conflict", async () => {
    const user = show([
      makeRead({ ...change, head: { ...change.head, source } }, true),
      { request: { query: APPEND_MATERIAL_CHANGE_MUTATION,
        variables: { input: { proposalId: id, expectedHeadId: headId, source: revised, message: "" } } },
        result: { errors: [new GraphQLError("hidden internal detail", { extensions: { code: "REVISION_CONFLICT" } })] } },
    ], changeHref(id) + "/edit");
    const input = await screen.findByLabelText("Текст правки");
    await user.clear(input);
    await user.type(input, revised);
    await user.click(screen.getByRole("button", { name: "Сохранить версию" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Версия изменилась на сервере");
    expect(screen.getByLabelText("Текст правки")).toHaveValue(revised);
    expect(screen.queryByText("hidden internal detail")).not.toBeInTheDocument();
  });

  it("renders Unicode and HTML-looking text literally and shows earlier revisions on request", async () => {
    const removed = "-Старая строка";
    const added = "+Новая строка <em>код</em> 日本語";
    const user = show([
      makeRead(), makeAuthor(),
      makeDiff(headId, `--- base\n+++ revision\n@@ -1,1 +1,1 @@\n${removed}\n${added}\n`),
      { request: { query: MATERIAL_CHANGE_HISTORY_QUERY, variables: { id, before: null } }, result: { data: { materialChangeHistory: {
        nextBeforeOrdinal: null, items: [{ id: oldId, ordinal: 1, authorId: owner, baseRevisionId, message: "Первый пример", createdAt: time }],
      } } } },
      makeDiff(oldId, "", true),
    ]);
    const region = await screen.findByRole("region", { name: "Строки изменений" });
    expect(within(region).getByText(added)).toBeInTheDocument();
    expect(region.querySelector("em")).toBeNull();
    expect(region.querySelector(".change-line--deletion")).toHaveTextContent(removed);
    expect(await screen.findByRole("link", { name: "author" })).toHaveAttribute("href", `/users/${owner}`);
    await user.click(screen.getByRole("button", { name: "История версий" }));
    await user.click(await screen.findByRole("button", { name: "Сравнить версию 1" }));
    expect(await screen.findByText("Сравнение неполное: превышен лимит diff.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Основание и версия 1" })).toBeInTheDocument();
    expect(screen.queryByText("Нет изменений в тексте")).not.toBeInTheDocument();
  });

  it("shows controls for the owner and closes only after confirmation", async () => {
    const user = show([
      makeRead(), makeAuthor(), makeDiff(headId),
      { request: { query: CLOSE_MATERIAL_CHANGE_MUTATION, variables: { id } },
        result: { data: { closeMaterialChange: { id, status: "closed" } } } },
    ]);
    expect(await screen.findByRole("link", { name: "Новая версия" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.getByText("Закрыть предложение?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Закрыть предложение" }));
    expect(await screen.findByText("Закрыто")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Новая версия" })).not.toBeInTheDocument();
  });

  it("does not let a reader edit or close another author's proposal", async () => {
    show([makeRead({ ...change, authorId: visitor }), makeAuthor(visitor), makeDiff(headId)]);
    expect(await screen.findByText("Нет изменений в тексте")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Новая версия" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeInTheDocument();
  });

  it("keeps large patches to 250 rendered lines at a time", async () => {
    const lines = Array.from({ length: 251 }, (_, index) => `+Строка ${index + 1}`);
    const user = show([makeRead(), makeAuthor(), makeDiff(headId, lines.join("\n"))]);
    const region = await screen.findByRole("region", { name: "Строки изменений" });
    expect(region.querySelectorAll(".change-line")).toHaveLength(250);
    await user.click(screen.getByRole("button", { name: "Следующая страница" }));
    expect(within(region).getByText("+Строка 251")).toBeInTheDocument();
    expect(region.querySelectorAll(".change-line")).toHaveLength(1);
  });
});
