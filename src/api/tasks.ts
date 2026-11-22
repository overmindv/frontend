import { gql, type TypedDocumentNode } from "@apollo/client";
import type * as Schema from "./generated";

export type ITTaskStatus = Schema.ItTaskStatus;
export type ITTaskType = Schema.ItTaskType;
export type ITTaskDifficulty = Schema.ItTaskDifficulty;
export type ITProgrammingLanguage = Schema.ItProgrammingLanguage;
export type ITCodeRunMode = Schema.ItCodeRunMode;
export type ITExecutionVerdict = Schema.ItExecutionVerdict;

export type ITTaskSummary = Schema.ItTaskSummaryFieldsFragment;
export type ITTaskTopic = Schema.ItTaskTopicsQuery["topics"][number];
export type ITTask = Schema.ItTaskFieldsFragment;
export type ITTaskList = Schema.ItTasksQuery["itTasks"];
export type ITSubmission = Schema.ItSubmissionFieldsFragment;
export type ITCodeSubmission = Schema.ItCodeSubmissionFieldsFragment;
export type ITExecutionPhaseResult = NonNullable<ITCodeSubmission["compilation"]>;

export type ITTaskFilter = Schema.ItTaskFilter;
export type ITAdminTaskFilter = Schema.ItAdminTaskFilter;
export type ITTaskInput = Schema.ItTaskInput;

export const TASK_SUMMARY_FIELDS = gql`
  fragment ITTaskSummaryFields on ITTaskSummary {
    id
    status
    taskVersionId
    versionNumber
    topicId
    title
    taskType
    difficulty
    createdAt
    updatedAt
  }
`;

const TASK_FIELDS = gql`
  fragment ITTaskFields on ITTask {
    id
    status
    taskVersionId
    versionNumber
    topicId
    title
    statement
    taskType
    difficulty
    createdAt
    updatedAt
    options {
      id
      text
      position
      isCorrect
    }
    tags
    examples { input output explanation }
    constraints
    source { sourceId sourceName sourceUrl publishedAt }
  }
`;

const SUBMISSION_FIELDS = gql`
  fragment ITSubmissionFields on ITSubmission {
    id
    userId
    taskId
    taskVersionId
    taskTitle
    taskVersionNumber
    selectedOptionIds
    correctOptionIds
    correct
    verdict
    taskUpdated
    latestTaskVersionId
    latestVersionNumber
    createdAt
  }
`;

const CODE_SUBMISSION_FIELDS = gql`
  fragment ITCodeSubmissionFields on ITCodeSubmission {
    runMode
    id
    userId
    taskId
    taskVersionId
    taskVersionNumber
    executionId
    correlationId
    language
    sourceFileName
    status
    verdict
    compilation {
      exitCode
      stdout
      stderr
      durationMs
      memoryBytes
    }
    execution {
      exitCode
      stdout
      stderr
      durationMs
      memoryBytes
    }
    tests {
      testId
      verdict
      stdout
      stderr
      durationMs
      memoryBytes
    }
    failure {
      code
      message
    }
    createdAt
    updatedAt
    completedAt
  }
`;

export const IT_TASKS_QUERY: TypedDocumentNode<Schema.ItTasksQuery, Schema.ItTasksQueryVariables> = gql`
  query ITTasks($filter: ITTaskFilter, $pagination: PaginationInput) {
    itTasks(filter: $filter, pagination: $pagination) {
      items { ...ITTaskSummaryFields }
      limit
      offset
    }
  }
  ${TASK_SUMMARY_FIELDS}
`;

export const IT_TASK_QUERY: TypedDocumentNode<Schema.ItTaskQuery, Schema.ItTaskQueryVariables> = gql`
  query ITTask($id: ID!) {
    itTask(id: $id) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const IT_TASK_TOPICS_QUERY: TypedDocumentNode<Schema.ItTaskTopicsQuery, Schema.ItTaskTopicsQueryVariables> = gql`
  query ITTaskTopics {
    topics(pagination: { limit: 100, offset: 0 }) {
      id
      title
    }
  }
`;

export const ADMIN_IT_TASKS_QUERY: TypedDocumentNode<Schema.AdminItTasksQuery, Schema.AdminItTasksQueryVariables> = gql`
  query AdminITTasks($filter: ITAdminTaskFilter, $pagination: PaginationInput) {
    adminITTasks(filter: $filter, pagination: $pagination) {
      items { ...ITTaskSummaryFields }
      limit
      offset
    }
  }
  ${TASK_SUMMARY_FIELDS}
`;

export const ADMIN_IT_TASK_QUERY: TypedDocumentNode<Schema.AdminItTaskQuery, Schema.AdminItTaskQueryVariables> = gql`
  query AdminITTask($id: ID!) {
    adminITTask(id: $id) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const IT_SUBMISSION_QUERY: TypedDocumentNode<Schema.ItSubmissionQuery, Schema.ItSubmissionQueryVariables> = gql`
  query ITSubmission($id: ID!) {
    itSubmission(id: $id) { ...ITSubmissionFields }
  }
  ${SUBMISSION_FIELDS}
`;

export const MY_IT_SUBMISSIONS_QUERY: TypedDocumentNode<Schema.MyItSubmissionsQuery, Schema.MyItSubmissionsQueryVariables> = gql`
  query MyITSubmissions($taskId: ID, $pagination: PaginationInput) {
    myITSubmissions(taskId: $taskId, pagination: $pagination) {
      items { ...ITSubmissionFields }
      limit
      offset
    }
  }
  ${SUBMISSION_FIELDS}
`;

export const IT_CODE_SUBMISSION_QUERY: TypedDocumentNode<Schema.ItCodeSubmissionQuery, Schema.ItCodeSubmissionQueryVariables> = gql`
  query ITCodeSubmission($id: ID!) {
    itCodeSubmission(id: $id) {
      ...ITCodeSubmissionFields
    }
  }
  ${CODE_SUBMISSION_FIELDS}
`;

export const MY_IT_CODE_SUBMISSIONS_QUERY: TypedDocumentNode<Schema.MyItCodeSubmissionsQuery, Schema.MyItCodeSubmissionsQueryVariables> = gql`
  query MyITCodeSubmissions($taskId: ID, $pagination: PaginationInput) {
    myITCodeSubmissions(taskId: $taskId, pagination: $pagination) {
      items {
        ...ITCodeSubmissionFields
      }
      limit
      offset
    }
  }
  ${CODE_SUBMISSION_FIELDS}
`;

export const CREATE_IT_TASK: TypedDocumentNode<Schema.CreateItTaskMutation, Schema.CreateItTaskMutationVariables> = gql`
  mutation CreateITTask($input: ITTaskInput!) {
    createITTask(input: $input) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const UPDATE_IT_TASK: TypedDocumentNode<Schema.UpdateItTaskMutation, Schema.UpdateItTaskMutationVariables> = gql`
  mutation UpdateITTask($id: ID!, $input: ITTaskInput!) {
    updateITTask(id: $id, input: $input) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const CHANGE_IT_TASK_STATUS: TypedDocumentNode<Schema.ChangeItTaskStatusMutation, Schema.ChangeItTaskStatusMutationVariables> = gql`
  mutation ChangeITTaskStatus($id: ID!, $status: ITTaskStatus!) {
    changeITTaskStatus(id: $id, status: $status) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const DELETE_IT_TASK: TypedDocumentNode<Schema.DeleteItTaskMutation, Schema.DeleteItTaskMutationVariables> = gql`
  mutation DeleteITTask($id: ID!) {
    deleteITTask(id: $id)
  }
`;

export const SUBMIT_IT_TASK_ANSWER: TypedDocumentNode<Schema.SubmitItTaskAnswerMutation, Schema.SubmitItTaskAnswerMutationVariables> = gql`
  mutation SubmitITTaskAnswer($taskId: ID!, $input: ITSubmissionInput!) {
    submitITTaskAnswer(taskId: $taskId, input: $input) { ...ITSubmissionFields }
  }
  ${SUBMISSION_FIELDS}
`;

export const SUBMIT_IT_TASK_CODE: TypedDocumentNode<Schema.SubmitItTaskCodeMutation, Schema.SubmitItTaskCodeMutationVariables> = gql`
  mutation SubmitITTaskCode($taskId: ID!, $input: ITCodeSubmissionInput!) {
    submitITTaskCode(taskId: $taskId, input: $input) {
      ...ITCodeSubmissionFields
    }
  }
  ${CODE_SUBMISSION_FIELDS}
`;
