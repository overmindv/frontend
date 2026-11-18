import { gql } from "@apollo/client";

export const MATERIALS_QUERY = gql`
  query Materials($topicId: ID, $cursor: String) {
    materials(filter: { topicId: $topicId, status: published }, limit: 20, cursor: $cursor) {
      nextCursor
      items { id title createdAt learning { estimatedMinutes } }
    }
  }
`;

export const MATERIAL_TOPICS_QUERY = gql`
  query MaterialTopics {
    topics(filter: { status: active }, pagination: { limit: 50 }) { id title }
  }
`;

export const PUBLISHED_MATERIAL_QUERY = gql`
  query PublishedMaterial($id: ID!) {
    publishedMaterial(id: $id) {
      id title description status authorId publishedAt publishedRevisionId
      revision { id number format source }
      attachments { fileId kind title position }
      learning { estimatedMinutes topicIds learningOutcomes }
    }
  }
`;

export const MATERIAL_HISTORY_QUERY = gql`
  query MaterialHistory($id: ID!, $before: Int) {
    materialRevisions(id: $id, limit: 12, beforeRevision: $before) {
      nextBeforeRevision
      items { id number message createdAt }
    }
  }
`;

export const MATERIAL_DOWNLOAD_QUERY = gql`
  query MaterialDownload($id: ID!) {
    mediaDownloadUrl(fileId: $id) { url expiresAt }
  }
`;

export type MaterialCatalogResult = {
  materials: {
    nextCursor: string | null;
    items: { id: string; title: string; createdAt: string; learning: { estimatedMinutes: number } | null }[];
  } | null;
};

export type PublishedMaterial = {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  authorId: string | null;
  publishedAt: string | null;
  publishedRevisionId: string | null;
  revision: { id: string; number: number; format: "markdown" | "typst"; source: string } | null;
  attachments: MaterialAttachment[];
  learning: { estimatedMinutes: number; topicIds: string[]; learningOutcomes: string[] } | null;
};

export type MaterialAttachment = {
  fileId: string;
  kind: "image" | "attachment" | "pdf" | "archive";
  title: string;
  position: number;
};

export type MaterialHistoryResult = {
  materialRevisions: {
    nextBeforeRevision: number | null;
    items: { id: string; number: number; message: string; createdAt: string }[];
  } | null;
};

export type MaterialDownloadResult = { mediaDownloadUrl: { url: string; expiresAt: string } };

export function materialsHref(topic?: string | null, cursor?: string | null, drafts = false) {
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  if (cursor) params.set("cursor", cursor);
  if (drafts) params.set("view", "drafts");
  const search = params.toString();
  return search ? `/materials?${search}` : "/materials";
}

export function isMaterialID(value: string): boolean {
  return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value) &&
    value !== "00000000-0000-0000-0000-000000000000";
}

const dayFormat = new Intl.DateTimeFormat("ru", { day: "numeric", month: "short", year: "numeric" });

export function materialDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dayFormat.format(date);
}
