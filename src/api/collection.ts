import { gql, type TypedDocumentNode } from "@apollo/client";
import type * as Schema from "./generated";

export type TaskCandidateStatus = Schema.TaskCandidateStatus;
export type TaskCollectionJobStatus = Schema.TaskCollectionJobStatus;
export type ProblemList = Schema.ProblemListFieldsFragment;
export type TaskCandidateReviewInput = Schema.TaskCandidateReviewInput;
export type TaskCollectionJob = Schema.TaskCollectionJobFieldsFragment;

const CANDIDATE_FIELDS = gql`
  fragment TaskCandidateFields on TaskCandidate {
    id status revision externalId sourceId sourceName sourceUrl sourcePublishedAt retrievedAt
    collectionJobId topicId problemListId title statement difficulty tags constraints approvedTaskId rejectionReason createdAt updatedAt
    examples { input output explanation }
  }
`;

const JOB_FIELDS = gql`
  fragment TaskCollectionJobFields on TaskCollectionJob {
    id trigger requestedBy status collectedTotal importedTotal duplicatesTotal invalidTotal errorCount errorMessage
    notificationAcknowledged createdAt finishedAt
  }
`;

export const COLLECTION_SOURCES_QUERY: TypedDocumentNode<Schema.TaskCollectionSourcesQuery, Schema.TaskCollectionSourcesQueryVariables> = gql`
  query TaskCollectionSources { taskCollectionSources { telegramChannels websiteSources } }
`;

export const COLLECTION_JOBS_QUERY: TypedDocumentNode<Schema.TaskCollectionJobsQuery, Schema.TaskCollectionJobsQueryVariables> = gql`
  query TaskCollectionJobs($unreadOnly: Boolean, $pagination: PaginationInput) {
    taskCollectionJobs(unreadOnly: $unreadOnly, pagination: $pagination) {
      items { ...TaskCollectionJobFields }
      limit offset
    }
  }
  ${JOB_FIELDS}
`;

export const COLLECTION_JOB_QUERY: TypedDocumentNode<Schema.TaskCollectionJobQuery, Schema.TaskCollectionJobQueryVariables> = gql`
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

export const START_COLLECTION: TypedDocumentNode<Schema.StartTaskCollectionMutation, Schema.StartTaskCollectionMutationVariables> = gql`
  mutation StartTaskCollection($input: StartTaskCollectionInput!) {
    startTaskCollection(input: $input) { ...TaskCollectionJobFields }
  }
  ${JOB_FIELDS}
`;

export const ACKNOWLEDGE_COLLECTION_JOB: TypedDocumentNode<Schema.AcknowledgeTaskCollectionJobMutation, Schema.AcknowledgeTaskCollectionJobMutationVariables> = gql`
  mutation AcknowledgeTaskCollectionJob($id: ID!) { acknowledgeTaskCollectionJob(id: $id) }
`;

const PROBLEM_LIST_FIELDS = gql`
  fragment ProblemListFields on ProblemList {
    id name sourceId sourceUrl memberCount pendingCandidates createdAt updatedAt
  }
`;

export const PROBLEM_LISTS_QUERY: TypedDocumentNode<Schema.ProblemListsQuery, Schema.ProblemListsQueryVariables> = gql`
  query ProblemLists($pagination: PaginationInput) {
    problemLists(pagination: $pagination) {
      items { ...ProblemListFields }
      limit offset
    }
  }
  ${PROBLEM_LIST_FIELDS}
`;

export const PROBLEM_LIST_QUERY: TypedDocumentNode<Schema.ProblemListQuery, Schema.ProblemListQueryVariables> = gql`
  query ProblemList($id: ID!) {
    problemList(id: $id) {
      ...ProblemListFields
      members { taskId title difficulty status }
    }
  }
  ${PROBLEM_LIST_FIELDS}
`;

export const TASK_CANDIDATES_QUERY: TypedDocumentNode<Schema.TaskCandidatesQuery, Schema.TaskCandidatesQueryVariables> = gql`
  query TaskCandidates($filter: TaskCandidateFilter, $pagination: PaginationInput) {
    taskCandidates(filter: $filter, pagination: $pagination) {
      items { ...TaskCandidateFields }
      limit offset
    }
  }
  ${CANDIDATE_FIELDS}
`;

export const TASK_CANDIDATE_QUERY: TypedDocumentNode<Schema.TaskCandidateQuery, Schema.TaskCandidateQueryVariables> = gql`
  query TaskCandidate($id: ID!) { taskCandidate(id: $id) { ...TaskCandidateFields } }
  ${CANDIDATE_FIELDS}
`;

export const UPDATE_TASK_CANDIDATE: TypedDocumentNode<Schema.UpdateTaskCandidateMutation, Schema.UpdateTaskCandidateMutationVariables> = gql`
  mutation UpdateTaskCandidate($id: ID!, $input: TaskCandidateReviewInput!) {
    updateTaskCandidate(id: $id, input: $input) { ...TaskCandidateFields }
  }
  ${CANDIDATE_FIELDS}
`;

export const APPROVE_TASK_CANDIDATE: TypedDocumentNode<Schema.ApproveTaskCandidateMutation, Schema.ApproveTaskCandidateMutationVariables> = gql`
  mutation ApproveTaskCandidate($id: ID!, $input: TaskCandidateReviewInput!) {
    approveTaskCandidate(id: $id, input: $input) { id status taskType }
  }
`;

export const REJECT_TASK_CANDIDATE: TypedDocumentNode<Schema.RejectTaskCandidateMutation, Schema.RejectTaskCandidateMutationVariables> = gql`
  mutation RejectTaskCandidate($id: ID!, $expectedRevision: Int!, $reason: String) {
    rejectTaskCandidate(id: $id, expectedRevision: $expectedRevision, reason: $reason) { ...TaskCandidateFields }
  }
  ${CANDIDATE_FIELDS}
`;
