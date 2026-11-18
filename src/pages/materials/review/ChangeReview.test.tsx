import { InMemoryCache } from "@apollo/client";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { MaterialChange } from "../../../api/materialChanges";
import {
  CREATE_MATERIAL_REVIEW_THREAD_MUTATION, MATERIAL_REVIEW_PUBLICATION_QUERY, MATERIAL_REVIEW_REPLIES_QUERY,
  MATERIAL_REVIEW_STATUS_QUERY, MATERIAL_REVIEW_THREADS_QUERY, MERGE_MATERIAL_CHANGE_MUTATION,
  REPLY_TO_MATERIAL_REVIEW_THREAD_MUTATION, SET_MATERIAL_REVIEW_THREAD_RESOLVED_MUTATION, SUBMIT_MATERIAL_REVIEW_MUTATION,
  type MaterialReviewStatus, type MaterialReviewThread,
} from "../../../api/materialReview";
import ChangeReview from "./ChangeReview";

const idFor = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = idFor(11), author = idFor(12), owner = idFor(13), id = idFor(14), materialId = idFor(15), base = idFor(16);
const headId = idFor(17), oldId = idFor(18), time = "2026-11-18T10:00:00Z";
const head = { id: headId, ordinal: 2, message: "", createdAt: time };
const change: MaterialChange = { id, materialId, authorId: author, baseRevisionId: base, status: "open", baseOutdated: false, createdAt: time, head };
const pending: MaterialReviewStatus = {
  revisionId: headId, current: true, outcome: "pending", waitReason: null, hasUnresolvedDiscussions: false,
  assignments: [{ reviewerId: actor, slot: 1 }], decisions: [],
};
const thread: MaterialReviewThread = {
  id: "41", revisionId: oldId, lineNumber: 2, body: "Сверить пример", authorId: actor, resolved: false, createdAt: time,
};

vi.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ userId: "00000000-0000-4000-8000-000000000011" }) }));

function review(value: MaterialReviewStatus): MockedResponse {
  return {
    request: { query: MATERIAL_REVIEW_STATUS_QUERY, variables: { id, revisionId: value.revisionId } },
    result: { data: { materialReviewStatus: value } },
  };
}

function threads(items: MaterialReviewThread[]): MockedResponse {
  return {
    request: { query: MATERIAL_REVIEW_THREADS_QUERY, variables: { id, after: null } },
    result: { data: { materialReviewThreads: { nextAfterId: null, items } } },
  };
}

function show(mocks: MockedResponse[], options: { proposal?: MaterialChange; isOwner?: boolean; revision?: typeof head } = {}) {
  const proposal = options.proposal ?? change;
  const refresh = vi.fn().mockResolvedValue(undefined);
  render(<MockedProvider addTypename={false} cache={new InMemoryCache({ addTypename: false })} mocks={[
    { request: { query: MATERIAL_REVIEW_PUBLICATION_QUERY, variables: { id: materialId } },
      result: { data: { publishedMaterial: { id: materialId, authorId: options.isOwner ? actor : owner, publishedRevisionId: base } } } },
    ...mocks,
  ]}>
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ChangeReview change={proposal} proposalStatus={proposal.status} revision={options.revision ?? head} refresh={refresh} />
    </MemoryRouter>
  </MockedProvider>);
  return { user: userEvent.setup(), refresh };
}

describe("proposal review", () => {
  it("does not accept votes from the proposal author even if assigned", async () => {
    show([review(pending), threads([])], { proposal: { ...change, authorId: actor } });
    expect(await screen.findByText("Автор предложения не может голосовать за него.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Одобрить" })).not.toBeInTheDocument();
  });

  it("shows an earlier approval without enabling merge or voting", async () => {
    show([review({
      ...pending, revisionId: oldId, current: false, outcome: "approved",
      decisions: [{ reviewerId: actor, decision: "approve", reason: "", createdAt: time, legacy: false }],
    }), threads([])], { isOwner: true, revision: { ...head, id: oldId, ordinal: 1 } });
    expect(await screen.findByText("Голоса этой версии не учитываются при принятии текущей.")).toBeInTheDocument();
    expect(screen.getByText("Одобрил")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Принять правку" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Одобрить" })).not.toBeInTheDocument();
  });

  it("sends the exact revision and rejects a stale vote", async () => {
    const { user } = show([
      review(pending), threads([]),
      { request: { query: SUBMIT_MATERIAL_REVIEW_MUTATION,
        variables: { input: { proposalId: id, revisionId: headId, decision: "request_changes", reason: "Добавить пример" } } },
      result: { errors: [new GraphQLError("private", { extensions: { code: "REVISION_CONFLICT" } })] } },
      review({ ...pending, current: false }),
    ]);
    const request = await screen.findByRole("button", { name: "Запросить правки" });
    expect(request).toBeDisabled();
    await user.type(screen.getByLabelText("Комментарий к решению"), "Добавить пример");
    await user.click(request);
    expect(await screen.findByText("Версия изменилась. Этот голос не был принят.")).toBeInTheDocument();
    expect(screen.queryByText("private")).not.toBeInTheDocument();
  });

  it("allows the material owner to accept only after an older discussion is resolved", async () => {
    const approved = { ...pending, outcome: "approved" as const, hasUnresolvedDiscussions: true };
    const { user, refresh } = show([
      review(approved), threads([thread]),
      { request: { query: SET_MATERIAL_REVIEW_THREAD_RESOLVED_MUTATION, variables: { id, threadId: thread.id, resolved: true } },
        result: { data: { setMaterialReviewThreadResolved: { id: thread.id, resolved: true } } } },
      review({ ...approved, hasUnresolvedDiscussions: false }), threads([{ ...thread, resolved: true }]),
      { request: { query: MERGE_MATERIAL_CHANGE_MUTATION, variables: { id, expectedHeadId: headId } },
        result: { data: { mergeMaterialChange: { materialId, publishedRevisionId: idFor(19) } } } },
    ], { isOwner: true });
    expect(await screen.findByText("Принятие недоступно, пока есть незакрытые обсуждения.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Принять правку" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Отметить решенным" }));
    await user.click(await screen.findByRole("button", { name: "Принять правку" }));
    await user.click(screen.getByRole("button", { name: "Опубликовать" }));
    expect(await screen.findByRole("link", { name: "Открыть материал" })).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("separates a publication conflict from a failed vote", async () => {
    const approved = { ...pending, outcome: "approved" as const };
    const { user, refresh } = show([
      review(approved), threads([]),
      { request: { query: MERGE_MATERIAL_CHANGE_MUTATION, variables: { id, expectedHeadId: headId } },
        result: { errors: [new GraphQLError("private", { extensions: { code: "MERGE_CONFLICT" } })] } },
      review(approved),
    ], { isOwner: true });
    await user.click(await screen.findByRole("button", { name: "Принять правку" }));
    await user.click(screen.getByRole("button", { name: "Опубликовать" }));
    expect(await screen.findByText("Основа предложения устарела.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Обновить основу" })).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not enable merge when an older service omits discussion status", async () => {
    show([review({ ...pending, outcome: "approved", hasUnresolvedDiscussions: null }), threads([])], { isOwner: true });
    expect(await screen.findByText("Сервер не вернул состояние обсуждений.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Принять правку" })).not.toBeInTheDocument();
  });

  it("creates a revision anchor and loads and posts replies only after expanding", async () => {
    const current = { ...thread, revisionId: headId };
    const reply = { id: "52", authorId: actor, body: "Исправлю", createdAt: time };
    const { user } = show([
      review(pending), threads([]),
      { request: { query: CREATE_MATERIAL_REVIEW_THREAD_MUTATION,
        variables: { input: { proposalId: id, revisionId: headId, lineNumber: 2, body: current.body } } },
      result: { data: { createMaterialReviewThread: current } } },
      review({ ...pending, hasUnresolvedDiscussions: true }), threads([current]),
      { request: { query: MATERIAL_REVIEW_REPLIES_QUERY, variables: { id, threadId: current.id, after: null } },
        result: { data: { materialReviewReplies: { items: [], nextAfterId: null } } } },
      { request: { query: REPLY_TO_MATERIAL_REVIEW_THREAD_MUTATION, variables: { id, threadId: current.id, body: reply.body } },
        result: { data: { replyToMaterialReviewThread: reply } } },
      { request: { query: MATERIAL_REVIEW_REPLIES_QUERY, variables: { id, threadId: current.id, after: null } },
        result: { data: { materialReviewReplies: { items: [reply], nextAfterId: null } } } },
    ]);
    await user.type(await screen.findByLabelText("Строка версии 2 (необязательно)"), "2");
    await user.type(screen.getByLabelText("Комментарий к версии 2"), current.body);
    await user.click(screen.getByRole("button", { name: "Добавить обсуждение" }));
    expect(await screen.findByText("Строка 2")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ответ")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ответы" }));
    await user.type(screen.getByLabelText("Ответ"), reply.body);
    await user.click(screen.getByRole("button", { name: "Ответить" }));
    expect(await screen.findByText(reply.body)).toBeInTheDocument();
  });
});
