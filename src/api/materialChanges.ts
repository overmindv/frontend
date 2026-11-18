import { gql } from "@apollo/client";

export const MATERIAL_CHANGE_QUERY = gql`
  query MaterialChange($id: ID!, $includeSource: Boolean!) {
    materialChangeProposal(id: $id) {
      id materialId authorId baseRevisionId status baseOutdated createdAt
      head { id ordinal message createdAt source @include(if: $includeSource) }
    }
  }
`;

export const MATERIAL_CHANGE_HISTORY_QUERY = gql`
  query MaterialChangeHistory($id: ID!, $before: Int) {
    materialChangeHistory(proposalId: $id, limit: 15, beforeOrdinal: $before) {
      nextBeforeOrdinal
      items { id ordinal authorId message createdAt baseRevisionId }
    }
  }
`;

export const MATERIAL_CHANGE_DIFF_QUERY = gql`
  query MaterialChangeDiff($id: ID!, $revisionId: ID!) {
    materialChangeDiff(proposalId: $id, revisionId: $revisionId) {
      baseRevisionId revisionId unifiedDiff truncated
    }
  }
`;

export const OPEN_MATERIAL_CHANGE_MUTATION = gql`
  mutation OpenMaterialChange($input: OpenMaterialChangeInput!) {
    openMaterialChange(input: $input) { id }
  }
`;

export const APPEND_MATERIAL_CHANGE_MUTATION = gql`
  mutation AppendMaterialChange($input: AppendMaterialChangeInput!) {
    appendMaterialChange(input: $input) { id head { id ordinal source } }
  }
`;

export const CLOSE_MATERIAL_CHANGE_MUTATION = gql`
  mutation CloseMaterialChange($id: ID!) {
    closeMaterialChange(proposalId: $id) { id status }
  }
`;

export const CHANGE_AUTHOR_QUERY = gql`
  query ChangeAuthor($id: ID!) {
    userProfile(id: $id) { id username }
  }
`;

export type OpenMaterialChangeInput = { materialId: string; baseRevisionId: string; source: string; message: string };
export type AppendMaterialChangeInput = { proposalId: string; expectedHeadId: string; source: string; message: string };

type ChangeRevisionSummary = {
  id: string;
  ordinal: number;
  message: string;
  createdAt: string;
};

export type MaterialChange = {
  id: string;
  materialId: string;
  authorId: string;
  baseRevisionId: string;
  status: "open" | "closed" | "merged";
  baseOutdated: boolean;
  createdAt: string;
  head: ChangeRevisionSummary & { source?: string };
};

export type MaterialChangeHistoryPage = {
  items: (ChangeRevisionSummary & { authorId: string; baseRevisionId: string })[];
  nextBeforeOrdinal: number | null;
};

export type MaterialChangeDiff = {
  baseRevisionId: string;
  revisionId: string;
  unifiedDiff: string;
  truncated: boolean;
};
