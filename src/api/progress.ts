import { gql } from "@apollo/client";

export interface PracticeProgressDay { date: string; attempts: number; accepted: number }
export interface PracticeProgressDifficulty { difficulty: "easy" | "medium" | "hard"; solved: number }
export interface PracticeProgress {
  userId: string;
  public: boolean;
  attempts: number;
  acceptedAttempts: number;
  solvedTasks: number;
  score: number;
  accuracyPercent: number;
  daily: PracticeProgressDay[];
  byDifficulty: PracticeProgressDifficulty[];
}

export interface PracticeLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  score: number;
  solvedTasks: number;
}

const PROGRESS_FIELDS = gql`
  fragment ProgressFields on PracticeProgress {
    userId public attempts acceptedAttempts solvedTasks score accuracyPercent
    daily { date attempts accepted }
    byDifficulty { difficulty solved }
  }
`;

export const MY_PROGRESS_QUERY = gql`
  query MyPracticeProgress { myPracticeProgress { ...ProgressFields } }
  ${PROGRESS_FIELDS}
`;

export const USER_PROGRESS_QUERY = gql`
  query UserPracticeProgress($userId: ID!) { practiceProgress(userId: $userId) { ...ProgressFields } }
  ${PROGRESS_FIELDS}
`;

export const SET_PROGRESS_PUBLIC_MUTATION = gql`
  mutation SetMyPracticeStatsPublic($public: Boolean!) { setMyPracticeStatsPublic(public: $public) }
`;

export const PRACTICE_LEADERBOARD_QUERY = gql`
  query PracticeLeaderboard($courseId: ID) {
    practiceLeaderboard(courseId: $courseId) { rank userId username displayName score solvedTasks }
  }
`;

export const RATING_COURSES_QUERY = gql`
  query RatingCourses($search: String!) {
    courses(filter: { search: $search, status: active }, pagination: { limit: 50, offset: 0 }) {
      id name status
    }
  }
`;
