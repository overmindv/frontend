import { gql } from "@apollo/client";

export const MATERIAL_REVIEW_STATUS_QUERY = gql`
  query MaterialReviewStatus($id: ID!, $revisionId: ID!) {
    materialReviewStatus(proposalId: $id, revisionId: $revisionId) {
      revisionId current outcome waitReason
      assignments { reviewerId slot }
      decisions { reviewerId decision reason createdAt legacy }
    }
  }
`;

export const MATERIAL_REVIEW_THREADS_QUERY = gql`
  query MaterialReviewThreads($id: ID!, $after: ID) {
    materialReviewThreads(proposalId: $id, limit: 12, afterId: $after) {
      nextAfterId
      items { id revisionId lineNumber authorId body createdAt resolved }
    }
  }
`;

export const MATERIAL_REVIEW_REPLIES_QUERY = gql`
  query MaterialReviewReplies($id: ID!, $threadId: ID!, $after: ID) {
    materialReviewReplies(proposalId: $id, threadId: $threadId, limit: 10, afterId: $after) {
      nextAfterId
      items { id authorId body createdAt }
    }
  }
`;

export const SUBMIT_MATERIAL_REVIEW_MUTATION = gql`
  mutation SubmitMaterialReview($input: SubmitMaterialReviewInput!) {
    submitMaterialReview(input: $input) { reviewerId decision }
  }
`;

export const CREATE_MATERIAL_REVIEW_THREAD_MUTATION = gql`
  mutation CreateMaterialReviewThread($input: CreateMaterialReviewThreadInput!) {
    createMaterialReviewThread(input: $input) { id revisionId lineNumber authorId body createdAt resolved }
  }
`;

export const REPLY_TO_MATERIAL_REVIEW_THREAD_MUTATION = gql`
  mutation ReplyToMaterialReviewThread($id: ID!, $threadId: ID!, $body: String!) {
    replyToMaterialReviewThread(proposalId: $id, threadId: $threadId, body: $body) { id authorId body createdAt }
  }
`;

export const SET_MATERIAL_REVIEW_THREAD_RESOLVED_MUTATION = gql`
  mutation SetMaterialReviewThreadResolved($id: ID!, $threadId: ID!, $resolved: Boolean!) {
    setMaterialReviewThreadResolved(proposalId: $id, threadId: $threadId, resolved: $resolved) { id resolved }
  }
`;

export const MERGE_MATERIAL_CHANGE_MUTATION = gql`
  mutation MergeMaterialChange($id: ID!, $expectedHeadId: ID!) {
    mergeMaterialChange(proposalId: $id, expectedHeadId: $expectedHeadId) { materialId publishedRevisionId }
  }
`;

export const REBASE_MATERIAL_CHANGE_MUTATION = gql`
  mutation RebaseMaterialChange($input: RebaseMaterialChangeInput!) {
    rebaseMaterialChange(input: $input) { id baseRevisionId head { id ordinal source } }
  }
`;

export const MATERIAL_REVIEW_PUBLICATION_QUERY = gql`
  query MaterialReviewPublication($id: ID!) {
    publishedMaterial(id: $id) { id authorId publishedRevisionId }
  }
`;

export type MaterialReviewDecisionKind = "approve" | "request_changes";

export type MaterialReviewStatus = {
  revisionId: string;
  current: boolean;
  outcome: "waiting_candidates" | "pending" | "approved" | "changes_requested";
  waitReason: string | null;
  assignments: { reviewerId: string; slot: number }[];
  decisions: { reviewerId: string; decision: MaterialReviewDecisionKind; reason: string; createdAt: string; legacy: boolean }[];
};

export type MaterialReviewReply = { id: string; authorId: string; body: string; createdAt: string };
export type MaterialReviewThread = MaterialReviewReply & { revisionId: string; lineNumber: number; resolved: boolean };
export type MaterialReviewPage<T> = { items: T[]; nextAfterId: string | null };
