import { gql } from "@apollo/client";

export type ITTaskStatus = "draft" | "published" | "archived";
export type ITTaskType = "single_choice" | "multiple_choice" | "programming";
export type ITTaskDifficulty = "easy" | "medium" | "hard";
export type ITSubmissionVerdict = "accepted" | "wrong_answer";
export type ITProgrammingLanguage = "python" | "go";
export type ITCodeSubmissionStatus = "queued" | "completed";
export type ITExecutionVerdict =
  | "accepted"
  | "wrong_answer"
  | "compilation_error"
  | "runtime_error"
  | "time_limit_exceeded"
  | "memory_limit_exceeded"
  | "output_limit_exceeded"
  | "checker_error"
  | "infrastructure_error"
  | "cancelled";

export interface ITTaskOption {
  id: string;
  text: string;
  position: number;
  isCorrect?: boolean | null;
}

export interface ITTaskSummary {
  id: string;
  status: ITTaskStatus;
  taskVersionId: string;
  versionNumber: number;
  topicId?: string | null;
  title: string;
  taskType: ITTaskType;
  difficulty: ITTaskDifficulty;
  createdAt: string;
  updatedAt: string;
}

export interface ITTask extends ITTaskSummary {
  statement: string;
  options: ITTaskOption[];
  tags: string[];
  examples: ITTaskExample[];
  constraints: string[];
  source?: ITTaskSource | null;
}

export interface ITTaskExample {
  input: string;
  output: string;
  explanation: string;
}

export interface ITTaskSource {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt?: string | null;
}

export interface ITTaskList {
  items: ITTaskSummary[];
  limit: number;
  offset: number;
}

export interface ITSubmission {
  id: string;
  userId: string;
  taskId: string;
  taskVersionId: string;
  taskVersionNumber: number;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  correct: boolean;
  verdict: ITSubmissionVerdict;
  taskUpdated: boolean;
  latestTaskVersionId: string;
  latestVersionNumber: number;
  createdAt: string;
}

export interface ITExecutionPhaseResult {
  exitCode?: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  memoryBytes: number;
}

export interface ITExecutionTestResult extends ITExecutionPhaseResult {
  testId: string;
  verdict: ITExecutionVerdict;
}

export interface ITExecutionFailure {
  code: string;
  message: string;
}

export interface ITCodeSubmission {
  id: string;
  userId: string;
  taskId: string;
  taskVersionId: string;
  taskVersionNumber: number;
  executionId: string;
  correlationId: string;
  language: ITProgrammingLanguage;
  sourceFileName: string;
  status: ITCodeSubmissionStatus;
  verdict?: ITExecutionVerdict | null;
  compilation?: ITExecutionPhaseResult | null;
  execution?: ITExecutionPhaseResult | null;
  tests: ITExecutionTestResult[];
  failure?: ITExecutionFailure | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface ITTaskFilter {
  taskType?: ITTaskType;
  difficulty?: ITTaskDifficulty;
  topicId?: string;
}

export interface ITAdminTaskFilter extends ITTaskFilter {
  status?: ITTaskStatus;
}

export interface ITTaskInput {
  topicId?: string | null;
  title: string;
  statement: string;
  taskType: ITTaskType;
  difficulty: ITTaskDifficulty;
  options: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  tags?: string[];
  examples?: ITTaskExample[];
  constraints?: string[];
}

export interface ITSubmissionInput {
  taskVersionId: string;
  idempotencyKey: string;
  selectedOptionIds: string[];
}

export interface ITCodeSubmissionInput {
  taskVersionId: string;
  idempotencyKey: string;
  language: ITProgrammingLanguage;
  file: File;
}

const TASK_SUMMARY_FIELDS = gql`
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

export const IT_TASKS_QUERY = gql`
  query ITTasks($filter: ITTaskFilter, $pagination: PaginationInput) {
    itTasks(filter: $filter, pagination: $pagination) {
      items { ...ITTaskSummaryFields }
      limit
      offset
    }
  }
  ${TASK_SUMMARY_FIELDS}
`;

export const IT_TASK_QUERY = gql`
  query ITTask($id: ID!) {
    itTask(id: $id) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const IT_TASK_TOPICS_QUERY = gql`
  query ITTaskTopics {
    topics(pagination: { limit: 100, offset: 0 }) {
      id
      title
    }
  }
`;

export const ADMIN_IT_TASKS_QUERY = gql`
  query AdminITTasks($filter: ITAdminTaskFilter, $pagination: PaginationInput) {
    adminITTasks(filter: $filter, pagination: $pagination) {
      items { ...ITTaskSummaryFields }
      limit
      offset
    }
  }
  ${TASK_SUMMARY_FIELDS}
`;

export const ADMIN_IT_TASK_QUERY = gql`
  query AdminITTask($id: ID!) {
    adminITTask(id: $id) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const IT_SUBMISSION_QUERY = gql`
  query ITSubmission($id: ID!) {
    itSubmission(id: $id) { ...ITSubmissionFields }
  }
  ${SUBMISSION_FIELDS}
`;

export const MY_IT_SUBMISSIONS_QUERY = gql`
  query MyITSubmissions($taskId: ID, $pagination: PaginationInput) {
    myITSubmissions(taskId: $taskId, pagination: $pagination) {
      items { ...ITSubmissionFields }
      limit
      offset
    }
  }
  ${SUBMISSION_FIELDS}
`;

export const IT_CODE_SUBMISSION_QUERY = gql`
  query ITCodeSubmission($id: ID!) {
    itCodeSubmission(id: $id) {
      ...ITCodeSubmissionFields
    }
  }
  ${CODE_SUBMISSION_FIELDS}
`;

export const MY_IT_CODE_SUBMISSIONS_QUERY = gql`
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

export const CREATE_IT_TASK = gql`
  mutation CreateITTask($input: ITTaskInput!) {
    createITTask(input: $input) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const UPDATE_IT_TASK = gql`
  mutation UpdateITTask($id: ID!, $input: ITTaskInput!) {
    updateITTask(id: $id, input: $input) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const CHANGE_IT_TASK_STATUS = gql`
  mutation ChangeITTaskStatus($id: ID!, $status: ITTaskStatus!) {
    changeITTaskStatus(id: $id, status: $status) { ...ITTaskFields }
  }
  ${TASK_FIELDS}
`;

export const DELETE_IT_TASK = gql`
  mutation DeleteITTask($id: ID!) {
    deleteITTask(id: $id)
  }
`;

export const SUBMIT_IT_TASK_ANSWER = gql`
  mutation SubmitITTaskAnswer($taskId: ID!, $input: ITSubmissionInput!) {
    submitITTaskAnswer(taskId: $taskId, input: $input) { ...ITSubmissionFields }
  }
  ${SUBMISSION_FIELDS}
`;

export const SUBMIT_IT_TASK_CODE = gql`
  mutation SubmitITTaskCode($taskId: ID!, $input: ITCodeSubmissionInput!) {
    submitITTaskCode(taskId: $taskId, input: $input) {
      ...ITCodeSubmissionFields
    }
  }
  ${CODE_SUBMISSION_FIELDS}
`;
