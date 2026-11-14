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

export interface PracticeSession { number: number; totalMinutes: number; items: PracticePlanItem[] }
export interface PracticeTopicInsight {
  topicId: string; title: string; isTarget: boolean; acceptedTasks: number; failedTasks: number;
  eligibleTasks: number; plannedTasks: number; remainingToReadiness: number;
  recommendedDifficulty: string; minimumMinutes: number; nextAction: string;
  blockedBy: { id: string; title: string }[];
}
export interface PracticePlan {
  aiStatus: string;
  requestedSessions: number;
  totalPlannedMinutes: number;
  sessions: PracticeSession[];
  topicInsights: PracticeTopicInsight[];
  policyVersion: string;
  totalMinutes: number;
  warnings: string[];
  items: PracticePlanItem[];
}

export interface PracticeGoal {
  topics: { id: string; title: string; status: CatalogStatus }[];
  minutes: number;
  revision: number;
  sessionCount: number;
}

export const PRACTICE_GOAL_QUERY = gql`
  query MyPracticeGoal {
    myPracticeGoal { topics { id title status } minutes sessionCount revision }
  }
`;

export const SAVE_PRACTICE_GOAL_MUTATION = gql`
  mutation SavePracticeGoal($topicIds: [ID!]!, $minutes: Int!, $sessionCount: Int) {
    savePracticeGoal(topicIds: $topicIds, minutes: $minutes, sessionCount: $sessionCount) {
      topics { id title status } minutes sessionCount revision
    }
  }
`;

export const DELETE_PRACTICE_GOAL_MUTATION = gql`
  mutation DeletePracticeGoal { deletePracticeGoal }
`;

export const PRACTICE_PLAN_QUERY = gql`
  query PracticePlan($topicIds: [ID!]!, $minutes: Int!, $sessionCount: Int, $goal: String) {
    practicePlan(topicIds: $topicIds, minutes: $minutes, sessionCount: $sessionCount, goal: $goal) {
      aiStatus policyVersion totalMinutes warnings requestedSessions totalPlannedMinutes
      sessions { number totalMinutes items { taskId taskVersionId topicId title difficulty taskType estimatedMinutes reasonCode } }
      topicInsights { topicId title isTarget acceptedTasks failedTasks eligibleTasks plannedTasks remainingToReadiness recommendedDifficulty minimumMinutes nextAction blockedBy { id title } }
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
