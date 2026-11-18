import { gql } from "@apollo/client";
import type { MaterialAttachment } from "./materials";

export const MY_MATERIAL_DRAFTS_QUERY = gql`
  query MyMaterialDrafts($authorId: ID!, $topicId: ID, $cursor: String) {
    materials(filter: { authorId: $authorId, topicId: $topicId, status: draft }, limit: 20, cursor: $cursor) {
      nextCursor
      items { id title createdAt learning { estimatedMinutes } }
    }
  }
`;

export const MATERIAL_DRAFT_QUERY = gql`
  query MaterialDraft($id: ID!) {
    material(id: $id) {
      id title status authorId
      revision { id number format source }
      attachments { fileId kind title position }
      learning { topicIds }
    }
  }
`;

export const CREATE_MATERIAL_DRAFT_MUTATION = gql`
  mutation CreateMaterialDraft($input: CreateMaterialDraftInput!) {
    createMaterialDraft(input: $input) { id title revision { id number format source } }
  }
`;

export const SAVE_MATERIAL_DRAFT_MUTATION = gql`
  mutation SaveMaterialDraft($input: SaveMaterialDraftInput!) {
    saveMaterialDraft(input: $input) { id number format source }
  }
`;

export const MATERIAL_TOPIC_SEARCH = gql`
  query MaterialTopicSearch($search: String!, $offset: Int!) {
    topics(filter: { status: active, search: $search }, pagination: { limit: 20, offset: $offset }) { id title }
  }
`;

export const MATERIAL_TOPIC_LABEL = gql`
  query MaterialTopicLabel($id: ID!) {
    topic(id: $id) { id title }
  }
`;

export type DraftRevision = {
  id: string;
  number: number;
  format: "markdown" | "typst";
  source: string;
};

export type MaterialDraft = {
  id: string;
  status: "draft" | "published" | "archived";
  title: string;
  authorId: string | null;
  revision: DraftRevision | null;
  attachments: MaterialAttachment[];
  learning: { topicIds: string[] } | null;
};

export type DraftTopic = { id: string; title: string };

export type DraftFields = {
  title: string;
  source: string;
  topicIds: string[];
  attachments: MaterialAttachment[];
};

export type NewDraftInput = {
  type: "note";
  title: string;
  slug: string;
  source: string;
  learning: { topicIds: string[] };
  attachments: MaterialAttachment[];
};

export type SaveDraftInput = {
  materialId: string;
  expectedRevisionId: string;
  source: string;
  metadata?: { title: string; topicIds: string[] };
  attachments?: MaterialAttachment[];
};
