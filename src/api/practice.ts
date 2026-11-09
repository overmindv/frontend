import { gql } from "@apollo/client";

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
