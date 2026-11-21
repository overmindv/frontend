import { InMemoryCache } from "@apollo/client";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  MATERIALS_QUERY, MATERIAL_DOWNLOAD_QUERY, MATERIAL_HISTORY_QUERY, MATERIAL_TOPICS_QUERY,
  PUBLISHED_MATERIAL_QUERY, type PublishedMaterial,
} from "../../api/materials";
import { IT_TASKS_QUERY } from "../../api/tasks";
import MaterialCatalogPage from "./MaterialCatalogPage";
import MaterialReadPage from "./MaterialReadPage";

const id = "00000000-0000-4000-8000-000000000201";
const topicId = "00000000-0000-4000-8000-000000000202";
const owner = "00000000-0000-4000-8000-000000000203";
const publication = "00000000-0000-4000-8000-000000000204";
const draft = "00000000-0000-4000-8000-000000000205";
const fileId = "00000000-0000-4000-8000-000000000206";
const taskId = "00000000-0000-4000-8000-000000000207";
const date = "2026-11-18T10:00:00Z";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ userId: "00000000-0000-4000-8000-000000000203" }) }));

const topics = {
  request: { query: MATERIAL_TOPICS_QUERY },
  result: { data: { topics: [{ id: topicId, title: "Графы" }] } },
};

const material: PublishedMaterial = {
  id, title: "Поиск в ширину", description: "Обход графа по уровням", status: "published", authorId: owner,
  publishedAt: date, publishedRevisionId: publication,
  revision: { id: publication, number: 2, format: "markdown", source: "Опубликованный текст" },
  attachments: [{ fileId, title: "Пример", kind: "pdf", position: 0 }],
  learning: { topicIds: [topicId], estimatedMinutes: 15, learningOutcomes: [] },
};

const tasks = {
  request: { query: IT_TASKS_QUERY, variables: { filter: { topicId }, pagination: { limit: 5, offset: 0 } } },
  result: { data: { itTasks: { __typename: "ITTaskList", items: [{
    __typename: "ITTaskSummary",
    id: taskId, status: "published", taskVersionId: "task-v1", versionNumber: 1, topicId,
    title: "Кратчайший путь", taskType: "programming", difficulty: "easy", createdAt: date, updatedAt: date,
  }], limit: 5, offset: 0 } } },
};

function published(item: PublishedMaterial) {
  return { request: { query: PUBLISHED_MATERIAL_QUERY, variables: { id } }, result: { data: { publishedMaterial: item } } };
}

function download(url: string, expiresAt = new Date(Date.now() + 30_000).toISOString()) {
  return {
    request: { query: MATERIAL_DOWNLOAD_QUERY, variables: { materialId: id, revisionId: publication, fileId } },
    result: { data: { publishedMaterialAttachmentDownload: { url, expiresAt } } },
  };
}

function show(route: string, mocks: MockedResponse[], cache?: InMemoryCache) {
  return render(<MockedProvider mocks={mocks} addTypename={false} cache={cache}>
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/materials" element={<MaterialCatalogPage />} />
        <Route path="/materials/:id" element={<MaterialReadPage />} />
      </Routes>
    </MemoryRouter>
  </MockedProvider>);
}

describe("material pages", () => {
  it("applies the topic filter and keeps the current cursor when opening a material", async () => {
    const page = (filter: string | null, cursor: string | null, title: string, nextCursor: string | null) => ({
      request: { query: MATERIALS_QUERY, variables: { topicId: filter, cursor } },
      result: { data: { materials: { items: [{ id, title, createdAt: date, learning: null }], nextCursor } } },
    });
    show("/materials", [topics, page(null, null, "Все материалы", null), page(topicId, null, "Тема: первая страница", "next"),
      page(topicId, "next", "Тема: вторая страница", null)]);
    const user = userEvent.setup();
    expect(await screen.findByText("Все материалы")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Тема"), topicId);
    expect(await screen.findByText("Тема: первая страница")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Следующая страница" }));
    expect(await screen.findByRole("link", { name: /Тема: вторая страница/ }))
      .toHaveAttribute("href", `/materials/${id}?topic=${topicId}&cursor=next`);
  });

  it("does not use cached drafts, loads related tasks and shows history only on request", async () => {
    const cache = new InMemoryCache({ addTypename: false });
    cache.writeQuery({
      query: PUBLISHED_MATERIAL_QUERY, variables: { id },
      data: { publishedMaterial: {
        __typename: "Material", ...material, revision: {
          __typename: "MaterialRevision", ...material.revision, id: draft, source: "Частный черновик",
        },
      } },
    });
    expect(cache.extract()[`Material:${id}`]).toBeDefined();
    const history = {
      request: { query: MATERIAL_HISTORY_QUERY, variables: { id, before: null } },
      result: { data: { materialRevisions: { nextBeforeRevision: null, items: [{ id: draft, number: 3, message: "Черновая правка", createdAt: date }] } } },
    };
    show(`/materials/${id}`, [published(material), topics, tasks, history], cache);
    const user = userEvent.setup();
    expect(await screen.findByText("Опубликованный текст")).toBeInTheDocument();
    expect(screen.queryByText("Частный черновик")).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Кратчайший путь" })).toHaveAttribute("href", `/tasks/${taskId}`);
    expect(screen.queryByText("Черновая правка")).not.toBeInTheDocument();
    await user.click(screen.getByText("История версий"));
    expect(await screen.findByText("Черновая правка")).toBeInTheDocument();
  });

  it("does not show the source when the returned revision does not match the publication", async () => {
    show(`/materials/${id}`, [published({ ...material, revision: { id: draft, number: 3, format: "markdown", source: "Частный черновик" } })]);
    expect(await screen.findByRole("heading", { name: "Материал не найден" })).toBeInTheDocument();
    expect(screen.queryByText("Частный черновик")).not.toBeInTheDocument();
  });

  it("handles a missing publication without showing upstream error details", async () => {
    show(`/materials/${id}`, [{
      request: { query: PUBLISHED_MATERIAL_QUERY, variables: { id } },
      result: { errors: [new GraphQLError("private upstream detail", { extensions: { code: "NOT_FOUND" } })] },
    }]);
    expect(await screen.findByRole("heading", { name: "Материал не найден" })).toBeInTheDocument();
    expect(screen.queryByText("private upstream detail")).not.toBeInTheDocument();
  });

  it("blocks a Media response with an untrusted link and allows requesting a new one", async () => {
    show(`/materials/${id}`, [
      published({ ...material, learning: null }),
      download("https://invalid.example/file.pdf"),
      download("http://localhost:9000/materials/file.pdf?sig=fixture"),
    ]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Скачать" }));
    expect(await screen.findByText("Скачивание недоступно")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Открыть" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Скачать" }));
    expect(await screen.findByRole("link", { name: "Открыть" }))
      .toHaveAttribute("href", "http://localhost:9000/materials/file.pdf?sig=fixture");
  });

  it("does not open an expired link from the publication download query", async () => {
    show(`/materials/${id}`, [
      published({ ...material, learning: null }),
      download("http://localhost:9000/materials/file.pdf?sig=old", "2000-01-01T00:00:00Z"),
    ]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Скачать" }));
    expect(await screen.findByText("Скачивание недоступно")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Открыть" })).not.toBeInTheDocument();
  });
});
