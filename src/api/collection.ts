import { gql } from "@apollo/client";
import type { ITTaskDifficulty, ITTaskExample } from "./tasks";

export type TaskCandidateStatus = "pending" | "approved" | "rejected";
export type TaskCollectionJobStatus = "queued" | "running" | "succeeded" | "partial" | "failed";

export interface TaskCollectionSource {
  id: string;
  kind: string;
  sourceId: string;
  url: string;
  status: string;
  collectedTotal: number;
  importedTotal: number;
  duplicatesTotal: number;
  invalidTotal: number;
  errorMessage: string;
}

export interface TaskCandidate {
  id: string;
  status: TaskCandidateStatus;
  revision: number;
  externalId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt?: string | null;
  retrievedAt: string;
  collectionJobId: string;
  topicId?: string | null;
  title: string;
  statement: string;
  difficulty: ITTaskDifficulty;
  tags: string[];
  examples: ITTaskExample[];
  constraints: string[];
  approvedTaskId?: string | null;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCandidateList {
  items: TaskCandidate[];
  limit: number;
  offset: number;
}

export interface TaskCandidateReviewInput {
  expectedRevision: number;
  topicId?: string | null;
  title: string;
  statement: string;
  difficulty: ITTaskDifficulty;
  tags: string[];
  examples: ITTaskExample[];
  constraints: string[];
}

export interface TaskCollectionJob {
  id: string;
  trigger: string;
  status: TaskCollectionJobStatus;
  collectedTotal: number;
  importedTotal: number;
  duplicatesTotal: number;
  invalidTotal: number;
  errorCount: number;
  errorMessage: string;
  notificationAcknowledged: boolean;
  createdAt: string;
  finishedAt?: string | null;
  sources?: TaskCollectionSource[];
}

const CANDIDATE_FIELDS = gql`
  fragment TaskCandidateFields on TaskCandidate {
    id status revision externalId sourceId sourceName sourceUrl sourcePublishedAt retrievedAt
    collectionJobId topicId title statement difficulty tags constraints approvedTaskId rejectionReason createdAt updatedAt
    examples { input output explanation }
  }
`;

const JOB_FIELDS = gql`
  fragment TaskCollectionJobFields on TaskCollectionJob {
    id trigger status collectedTotal importedTotal duplicatesTotal invalidTotal errorCount errorMessage
    notificationAcknowledged createdAt finishedAt
  }
`;

export const COLLECTION_SOURCES_QUERY = gql`
  query TaskCollectionSources { taskCollectionSources { telegramChannels websiteSources } }
`;

export const COLLECTION_JOBS_QUERY = gql`
  query TaskCollectionJobs($unreadOnly: Boolean, $pagination: PaginationInput) {
    taskCollectionJobs(unreadOnly: $unreadOnly, pagination: $pagination) {
      items { ...TaskCollectionJobFields }
      limit offset
    }
  }
  ${JOB_FIELDS}
`;

export const COLLECTION_JOB_QUERY = gql`
  query TaskCollectionJob($id: ID!) {
    taskCollectionJob(id: $id) {
      ...TaskCollectionJobFields
      sources {
        id kind sourceId url status collectedTotal importedTotal duplicatesTotal invalidTotal errorMessage
      }
    }
  }
  ${JOB_FIELDS}
`;

export const START_COLLECTION = gql`
  mutation StartTaskCollection($input: StartTaskCollectionInput!) {
    startTaskCollection(input: $input) { ...TaskCollectionJobFields }
  }
  ${JOB_FIELDS}
`;

export const ACKNOWLEDGE_COLLECTION_JOB = gql`
  mutation AcknowledgeTaskCollectionJob($id: ID!) { acknowledgeTaskCollectionJob(id: $id) }
`;

export const TASK_CANDIDATES_QUERY = gql`
  query TaskCandidates($filter: TaskCandidateFilter, $pagination: PaginationInput) {
    taskCandidates(filter: $filter, pagination: $pagination) {
      items { ...TaskCandidateFields }
      limit offset
    }
  }
  ${CANDIDATE_FIELDS}
`;

export const TASK_CANDIDATE_QUERY = gql`
  query TaskCandidate($id: ID!) { taskCandidate(id: $id) { ...TaskCandidateFields } }
  ${CANDIDATE_FIELDS}
`;

export const UPDATE_TASK_CANDIDATE = gql`
  mutation UpdateTaskCandidate($id: ID!, $input: TaskCandidateReviewInput!) {
    updateTaskCandidate(id: $id, input: $input) { ...TaskCandidateFields }
  }
  ${CANDIDATE_FIELDS}
`;

export const APPROVE_TASK_CANDIDATE = gql`
  mutation ApproveTaskCandidate($id: ID!, $input: TaskCandidateReviewInput!) {
    approveTaskCandidate(id: $id, input: $input) { id status taskType }
  }
`;

export const REJECT_TASK_CANDIDATE = gql`
  mutation RejectTaskCandidate($id: ID!, $expectedRevision: Int!, $reason: String) {
    rejectTaskCandidate(id: $id, expectedRevision: $expectedRevision, reason: $reason) { ...TaskCandidateFields }
  }
  ${CANDIDATE_FIELDS}
`;
