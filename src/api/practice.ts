import { gql } from "@apollo/client";
import type { CatalogStatus } from "./catalog";

export interface PracticePlanItem {
  taskId: string;
  taskVersionId: string;
  topicId: string;
  title: string;
  difficulty: string;
  taskType: string;
  estimatedMinutes: number;
  reasonCode: string;
}

export interface PracticePlan {
  policyVersion: string;
  totalMinutes: number;
  warnings: string[];
  items: PracticePlanItem[];
}

export interface PracticeGoal {
  topics: { id: string; title: string; status: CatalogStatus }[];
  minutes: number;
  revision: number;
}

export const PRACTICE_GOAL_QUERY = gql`
  query MyPracticeGoal {
    myPracticeGoal { topics { id title status } minutes revision }
  }
`;

export const SAVE_PRACTICE_GOAL_MUTATION = gql`
  mutation SavePracticeGoal($topicIds: [ID!]!, $minutes: Int!) {
    savePracticeGoal(topicIds: $topicIds, minutes: $minutes) {
      topics { id title status } minutes revision
    }
  }
`;

export const DELETE_PRACTICE_GOAL_MUTATION = gql`
  mutation DeletePracticeGoal { deletePracticeGoal }
`;

export const PRACTICE_PLAN_QUERY = gql`
  query PracticePlan($topicIds: [ID!]!, $minutes: Int!) {
    practicePlan(topicIds: $topicIds, minutes: $minutes) {
      policyVersion totalMinutes warnings
      items { taskId taskVersionId topicId title difficulty taskType estimatedMinutes reasonCode }
    }
  }
`;

// Отдельный запрос для практики: активные темы и явная пагинация без дерева каталога.
export const PRACTICE_TOPICS_QUERY = gql`
  query PracticeTopics($search: String!, $limit: Int!, $offset: Int!) {
    topics(filter: { search: $search, status: active }, pagination: { limit: $limit, offset: $offset }) {
      id title status
    }
  }
`;
