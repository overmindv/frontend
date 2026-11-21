import { InMemoryCache } from "@apollo/client";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CREATE_MATERIAL_DRAFT_MUTATION, MATERIAL_DRAFT_QUERY, MATERIAL_TOPIC_SEARCH, SAVE_MATERIAL_DRAFT_MUTATION,
  type DraftRevision, type MaterialDraft,
} from "../../../api/materialDrafts";
import { uploadMaterialAttachment } from "../../../api/materialMedia";
import MaterialDraftPage from "./MaterialDraftPage";

const id = "00000000-0000-4000-8000-000000000201";
const firstId = "00000000-0000-4000-8000-000000000202";
const secondId = "00000000-0000-4000-8000-000000000203";
const owner = "00000000-0000-4000-8000-000000000204";
const topicId = "00000000-0000-4000-8000-000000000205";
const fileId = "00000000-0000-4000-8000-000000000206";
const attachment = { fileId, kind: "pdf" as const, title: "sample.pdf" };
const original: DraftRevision = { id: firstId, number: 1, source: "# Текст", format: "markdown" };
const draft: MaterialDraft = { id, title: "Введение", status: "draft", authorId: owner, revision: original, attachments: [], learning: null };

vi.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ userId: "00000000-0000-4000-8000-000000000204" }) }));
vi.mock("../../../api/materialMedia", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../api/materialMedia")>(), uploadMaterialAttachment: vi.fn(),
}));

beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
  });
  vi.mocked(uploadMaterialAttachment).mockReset();
});

function readDraft(value = draft): MockedResponse {
  return { request: { query: MATERIAL_DRAFT_QUERY, variables: { id } }, result: { data: { material: value } } };
}

function mutation(input: Record<string, unknown>, result: MockedResponse["result"]): MockedResponse {
  return { request: { query: SAVE_MATERIAL_DRAFT_MUTATION, variables: { input } }, result };
}

const input = {
  materialId: id, expectedRevisionId: firstId, source: "# Текст\nНовая строка",
  metadata: { title: draft.title, topicIds: [] },
};
const saveSuccess = { data: { saveMaterialDraft: { ...original, id: secondId, number: 2, source: input.source } } };
const metadataSaved = { data: { saveMaterialDraft: { ...original, id: secondId, number: 2 } } };

function show(mocks: MockedResponse[], path = `/materials/${id}/edit`) {
  const router = createMemoryRouter([
    { path: "/materials/:id/edit", element: <MaterialDraftPage /> },
    { path: "/materials/new", element: <MaterialDraftPage /> },
    { path: "/materials", element: <h1>Каталог</h1> },
  ], { initialEntries: ["/materials", path] });
  render(<MockedProvider mocks={mocks} addTypename={false} cache={new InMemoryCache({ addTypename: false })}>
    <RouterProvider router={router} />
  </MockedProvider>);
  return userEvent.setup();
}

async function addLine(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Текст Markdown"), "{End}{Enter}Новая строка");
}

describe("draft photo groups", () => {
  const secondFile = "00000000-0000-4000-8000-000000000212";
  const photos = [
    { fileId, kind: "image" as const, title: "Первое.png", position: 0 },
    { fileId: secondFile, kind: "image" as const, title: "Второе.jpg", position: 1 },
  ];
  const photoDraft: MaterialDraft = {
    ...draft, revision: { ...original, source: "Первый абзац.\n\nСледующий абзац." }, attachments: [...photos],
  };
  const group = "```ovm-photos\n" + secondFile + "\n" + fileId + "\n```";

  it("inserts selected photos in click order and saves the same source", async () => {
    const source = "Первый абзац.\n\n" + group + "\n\nСледующий абзац.";
    const user = show([
      readDraft(photoDraft),
      mutation({ ...input, source }, { data: { saveMaterialDraft: { ...original, id: secondId, number: 2, source } } }),
    ]);
    const textarea = await screen.findByLabelText<HTMLTextAreaElement>("Текст Markdown");
    const cursor = textarea.value.indexOf("Следующий");
    await user.click(textarea);
    textarea.setSelectionRange(cursor, cursor);
    await user.click(screen.getByRole("button", { name: "Вставить фото" }));
    const picker = within(await screen.findByRole("dialog", { name: "Вставить фото" }));
    await user.click(picker.getByRole("checkbox", { name: "Второе.jpg" }));
    await user.click(picker.getByRole("checkbox", { name: "Первое.png" }));
    expect(picker.getByText("2 / 10")).toBeInTheDocument();
    await user.click(picker.getByRole("button", { name: "Вставить" }));
    expect(textarea).toHaveValue(source);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Предпросмотр" }));
    await vi.dynamicImportSettled();
    const preview = within(await screen.findByRole("figure", { name: "Группа фото" }));
    expect(preview.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Второе.jpg", "Первое.png"]);
    expect(preview.queryByRole("img")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Черновик сохранен")).toBeInTheDocument();
  });

  it("does not send a draft with a group pointing to a removed photo", async () => {
    const read = { ...photoDraft, revision: { ...original, source: group } };
    const matched = vi.fn(() => true);
    const user = show([readDraft(read), {
      request: { query: SAVE_MATERIAL_DRAFT_MUTATION },
      variableMatcher: matched, result: saveSuccess,
    }]);
    await user.click(await screen.findByRole("button", { name: "Убрать вложение: Второе.jpg" }));
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("В тексте есть фото, которого нет во вложениях.");
    expect(matched).not.toHaveBeenCalled();
  });
});

describe("material draft editor", () => {
  it("creates a draft explicitly and opens its own edit route", async () => {
    const source = "# Заголовок\n";
    const matchInput = vi.fn(({ input }) => /^material-[a-f0-9-]{36}$/.test(input.slug) &&
      input.title === "Графы" && input.source === source && input.learning.topicIds.length === 0);
    const material = { ...draft, title: "Графы", revision: { ...original, source } };
    const user = show([
      { request: { query: CREATE_MATERIAL_DRAFT_MUTATION }, variableMatcher: matchInput,
        result: { data: { createMaterialDraft: { id, revision: material.revision } } } },
      readDraft(material),
    ], "/materials/new");
    await user.type(screen.getByLabelText("Заголовок"), "Графы");
    await user.type(screen.getByLabelText("Текст Markdown"), "# Заголовок{Enter}");
    expect(matchInput).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Предпросмотр" }));
    await vi.dynamicImportSettled();
    expect(await screen.findByRole("heading", { name: "Заголовок", level: 2 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByRole("heading", { name: "Редактор черновика" })).toBeInTheDocument();
    expect(screen.getByLabelText("Текст Markdown")).toHaveValue(source);
    expect(matchInput).toHaveBeenCalledOnce();
  });

  it("asks before discarding local edits on navigation", async () => {
    const user = show([readDraft()]);
    await addLine(user);
    const unload = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(unload)).toBe(false);
    await user.click(screen.getByRole("link", { name: "Мои черновики" }));
    expect(screen.getByRole("dialog", { name: "Уйти без сохранения?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Остаться" }));
    expect(screen.getByLabelText("Текст Markdown")).toHaveValue(input.source);
    await user.click(screen.getByRole("link", { name: "Мои черновики" }));
    await user.click(screen.getByRole("button", { name: "Уйти" }));
    expect(await screen.findByRole("heading", { name: "Каталог" })).toBeInTheDocument();
    expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(true);
  });

  it("keeps edits after a network failure and saves them on retry", async () => {
    const user = show([
      readDraft(),
      { request: { query: SAVE_MATERIAL_DRAFT_MUTATION, variables: { input } }, error: new Error("private upstream detail") },
      mutation(input, saveSuccess),
    ]);
    await addLine(user);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Не удалось сохранить черновик. Ваши правки остались в редакторе.")).toBeInTheDocument();
    expect(screen.queryByText("private upstream detail")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Текст Markdown")).toHaveValue(input.source);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Черновик сохранен")).toBeInTheDocument();
    expect(screen.getByText("Ревизия 2")).toBeInTheDocument();
    expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(true);
  });

  it("keeps local text on revision conflict until the author discards it", async () => {
    const latest = { ...draft, revision: { ...original, id: secondId, number: 2, source: "Правка в другой вкладке" } };
    const user = show([
      readDraft(),
      mutation(input, { errors: [new GraphQLError("stale", { extensions: { code: "REVISION_CONFLICT" } })] }),
      readDraft(latest),
    ]);
    await addLine(user);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Черновик изменился на сервере. Ваши правки остались в редакторе.")).toBeInTheDocument();
    expect(screen.getByLabelText("Текст Markdown")).toHaveValue(input.source);
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Сбросить правки и загрузить версию" }));
    expect(await screen.findByText("Открыта новая версия")).toBeInTheDocument();
    expect(screen.getByLabelText("Текст Markdown")).toHaveValue(latest.revision.source);
  });

  it("sends selected topics and title together with the expected revision", async () => {
    const metadata = { title: "Новый заголовок", topicIds: [topicId] };
    const user = show([
      readDraft(),
      { request: { query: MATERIAL_TOPIC_SEARCH, variables: { search: "", offset: 0 } },
        result: { data: { topics: [{ id: topicId, title: "Поиск в графе" }] } } },
      mutation({ ...input, source: original.source, metadata }, metadataSaved),
    ]);
    const title = await screen.findByLabelText("Заголовок");
    await user.clear(title);
    await user.type(title, metadata.title);
    await user.click(screen.getByRole("button", { name: "Добавить тему" }));
    await user.click(await screen.findByRole("button", { name: "Поиск в графе" }));
    expect(screen.getByRole("button", { name: "Убрать тему: Поиск в графе" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Черновик сохранен")).toBeInTheDocument();
  });

  it("adds a ready attachment and clears the set after removal", async () => {
    vi.mocked(uploadMaterialAttachment).mockResolvedValue(attachment);
    const user = show([
      readDraft(),
      mutation({ ...input, source: original.source, attachments: [{ ...attachment, position: 0 }] }, metadataSaved),
      mutation({ ...input, source: original.source, expectedRevisionId: secondId, attachments: [] }, {
        data: { saveMaterialDraft: { ...original, id: "00000000-0000-4000-8000-000000000207", number: 3 } },
      }),
    ]);
    await user.upload(await screen.findByLabelText("Добавить вложение"), new File(["data"], attachment.title, { type: "application/pdf" }));
    const remove = await screen.findByRole("button", { name: "Убрать вложение: sample.pdf" });
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Ревизия 2")).toBeInTheDocument();
    await user.click(remove);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Ревизия 3")).toBeInTheDocument();
    expect(screen.queryByText("sample.pdf")).not.toBeInTheDocument();
  });

  it("does not render a document owned by another author", async () => {
    show([readDraft({ ...draft, authorId: topicId })]);
    expect(await screen.findByText("Черновик недоступен")).toBeInTheDocument();
    expect(screen.queryByLabelText("Текст Markdown")).not.toBeInTheDocument();
  });
});
