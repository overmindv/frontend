import { InMemoryCache } from "@apollo/client";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
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

function download(url: string, expiresAt = new Date(Date.now() + 30_000).toISOString(), attachmentId = fileId) {
  return {
    request: { query: MATERIAL_DOWNLOAD_QUERY, variables: { materialId: id, revisionId: publication, fileId: attachmentId } },
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

  it("lists a photo after the article text and requests its download on demand", async () => {
    const url = "http://localhost:9000/materials/diagram.webp?sig=fixture";
    const photoDownload = download(url);
    const getDownload = vi.fn(() => photoDownload.result);
    show(`/materials/${id}`, [
      published({ ...material, learning: null, attachments: [{ fileId, title: "Граф.png", kind: "image", position: 0 }] }),
      { ...photoDownload, result: getDownload },
    ]);
    const user = userEvent.setup();
    const article = await screen.findByRole("article");
    const source = within(article).getByText("Опубликованный текст");
    const heading = within(article).getByRole("heading", { name: "Вложения" });
    expect(source.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(article).getByText("Граф.png")).toBeInTheDocument();
    expect(getDownload).not.toHaveBeenCalled();
    await user.click(within(article).getByRole("button", { name: "Скачать" }));
    expect(await within(article).findByRole("link", { name: "Открыть" })).toHaveAttribute("href", url);
    expect(getDownload).toHaveBeenCalledOnce();
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

describe("material photo viewer", () => {
  beforeAll(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
      close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
    });
  });

  const firstPhoto = { fileId, kind: "image" as const, title: "Схема.png", position: 0 };
  const secondPhoto = { fileId: "00000000-0000-4000-8000-000000000208", kind: "image" as const, title: "Пример.jpg", position: 2 };
  const firstURL = "http://localhost:9000/materials/diagram.webp?sig=first";
  const secondURL = "http://localhost:9000/materials/example.webp?sig=second";

  it("loads only the selected photo and skips other attachment types when moving", async () => {
    const first = download(firstURL);
    const second = download(secondURL, undefined, secondPhoto.fileId);
    const firstResult = vi.fn(() => first.result);
    const secondResult = vi.fn(() => second.result);
    const pdf = { fileId: "00000000-0000-4000-8000-000000000209", kind: "pdf" as const, title: "Справка.pdf", position: 1 };
    show(`/materials/${id}`, [
      published({ ...material, learning: null, attachments: [firstPhoto, pdf, secondPhoto] }),
      { ...first, result: firstResult, maxUsageCount: 2 },
      { ...second, result: secondResult },
    ]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Открыть фото: Схема.png" }));
    const dialog = await screen.findByRole("dialog", { name: "Просмотр фото" });
    const viewer = within(dialog);
    expect(await viewer.findByRole("img", { name: "Схема.png" })).toHaveAttribute("src", firstURL);
    expect(firstResult).toHaveBeenCalledOnce();
    expect(secondResult).not.toHaveBeenCalled();
    expect(viewer.getByText("1 / 2")).toBeInTheDocument();
    expect(viewer.getByRole("button", { name: "Предыдущее фото" })).toHaveAttribute("aria-disabled", "true");

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(viewer.queryByRole("img", { name: "Схема.png" })).not.toBeInTheDocument();
    expect(await viewer.findByRole("img", { name: "Пример.jpg" })).toHaveAttribute("src", secondURL);
    expect(viewer.getByText("2 / 2")).toBeInTheDocument();
    expect(viewer.getByRole("button", { name: "Следующее фото" })).toHaveAttribute("aria-disabled", "true");
    await user.click(viewer.getByRole("button", { name: "Предыдущее фото" }));
    expect(await viewer.findByRole("img", { name: "Схема.png" })).toHaveAttribute("src", firstURL);
    expect(firstResult).toHaveBeenCalledTimes(2);
    expect(secondResult).toHaveBeenCalledOnce();

    await user.click(viewer.getByRole("button", { name: "Закрыть фото" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render a foreign URL and can retry a failed image", async () => {
    show(`/materials/${id}`, [
      published({ ...material, learning: null, attachments: [firstPhoto] }),
      download("https://untrusted.example/photo.webp"),
      download(firstURL),
      download(firstURL),
    ]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Открыть фото: Схема.png" }));
    const dialog = await screen.findByRole("dialog");
    const viewer = within(dialog);
    expect(await viewer.findByText("Не удалось открыть фото")).toBeInTheDocument();
    expect(viewer.queryByRole("img")).not.toBeInTheDocument();
    await user.click(viewer.getByRole("button", { name: "Повторить" }));
    expect(viewer.getByRole("button", { name: "Закрыть фото" })).toHaveFocus();
    const image = await viewer.findByRole("img");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    fireEvent.error(image);
    await user.click(await viewer.findByRole("button", { name: "Повторить" }));
    const retried = await viewer.findByRole("img");
    fireEvent.load(retried);
    expect(retried).toHaveAttribute("src", firstURL);
    expect(viewer.queryByText("Загружаем фото")).not.toBeInTheDocument();

    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("inline photo groups", () => {
  const photoA = { fileId, kind: "image" as const, title: "Первый.png", position: 0 };
  const photoB = { fileId: "00000000-0000-4000-8000-000000000210", kind: "image" as const, title: "Второй.jpg", position: 1 };
  const pdf = { fileId: "00000000-0000-4000-8000-000000000211", kind: "pdf" as const, title: "Файл.pdf", position: 2 };

  function article(source: string) {
    return published({ ...material, learning: null, revision: { id: publication, number: 2, format: "markdown", source },
      attachments: [photoA, photoB, pdf] });
  }

  function group(...ids: string[]) {
    return "```ovm-photos\n" + ids.join("\n") + "\n```";
  }

  it("renders the group in place and requests only the current frame in source order", async () => {
    const initial = download("http://localhost:9000/photos/two.webp?sig=fixture", undefined, photoB.fileId);
    const next = download("http://localhost:9000/photos/one.webp?sig=fixture", undefined, photoA.fileId);
    const firstResult = vi.fn(() => initial.result);
    const nextResult = vi.fn(() => next.result);

    show(`/materials/${id}`, [
      article("До группы.\n\n" + group(photoB.fileId, photoA.fileId) + "\n\nПосле группы."),
      { ...initial, result: firstResult },
      { ...next, result: nextResult },
    ]);
    const user = userEvent.setup();
    const box = await screen.findByRole("figure", { name: "Группа фото" });
    const view = within(box);
    expect(screen.getByText("До группы.").compareDocumentPosition(box)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(box.compareDocumentPosition(screen.getByText("После группы."))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(firstResult).not.toHaveBeenCalled();
    expect(nextResult).not.toHaveBeenCalled();
    await user.click(view.getByRole("button", { name: "Показать фото" }));
    const frame = await view.findByRole("img", { name: "Второй.jpg" });
    fireEvent.load(frame);
    expect(firstResult).toHaveBeenCalledOnce();
    expect(nextResult).not.toHaveBeenCalled();
    expect(view.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.touchStart(frame, { touches: [{ clientX: 178, clientY: 60 }] });
    fireEvent.touchEnd(frame, { changedTouches: [{ clientX: 48, clientY: 63 }] });
    expect(await view.findByRole("img", { name: "Первый.png" })).toBeInTheDocument();
    expect(view.getByText("2 / 2")).toBeInTheDocument();
    expect(nextResult).toHaveBeenCalledOnce();
    expect(view.getByRole("button", { name: "Следующий кадр" })).toHaveAttribute("aria-disabled", "true");
  });

  it("does not resolve external URLs, non-photo attachments or IDs outside the publication", async () => {
    const unknown = "00000000-0000-4000-8000-000000000212";
    const example = "````markdown\n" + group(unknown) + "\n````";
    const sources = [group(pdf.fileId), group(unknown), group("https://external.invalid/image.jpg"), example];
    show(`/materials/${id}`, [article(sources.join("\n\n"))]);
    const materialBody = await screen.findByRole("article");
    expect(within(materialBody).getAllByText("Группа фото недоступна")).toHaveLength(3);
    expect(within(materialBody).queryByRole("figure")).not.toBeInTheDocument();
    expect(within(materialBody).queryByRole("img")).not.toBeInTheDocument();
    expect(materialBody.querySelector("pre")).toHaveTextContent(unknown);
  });
});
