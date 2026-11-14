import { gql } from "@apollo/client";
export type MaterialStatus = "TODO" | "IN_PROGRESS" | "DONE";
export interface SavedPlan {
 id: string; goal: string; isOwner: boolean; public: boolean; revision: number; minutes: number; sessionCount: number; progressAvailable: boolean;
 materials: { id: string; title: string; url: string; action: string; minutes: number; status: MaterialStatus }[];
 tasks: { id: string; versionId: string; title: string; minutes: number; completed: boolean; completionVersionId?: string | null }[];
}
const FIELDS = gql`fragment SavedPlanFields on SavedLearningPlan {
 id goal isOwner public revision minutes sessionCount progressAvailable
 materials { id title url action minutes status }
 tasks { id versionId title minutes completed completionVersionId }
}`;
export const SAVED_PLAN = gql`query SavedLearningPlan($id: ID!) { savedLearningPlan(id: $id) { ...SavedPlanFields } } ${FIELDS}`;
export const MY_PLANS = gql`query MyLearningPlans { myLearningPlans { id goal public materials { id status } tasks { id } } }`;
export const SAVE_PLAN = gql`mutation SaveLearningPlan($goal: String!, $minutes: Int!, $sessionCount: Int!, $requestId: ID!) { saveLearningPlan(goal: $goal, minutes: $minutes, sessionCount: $sessionCount, requestId: $requestId) { id } }`;
export const MARK_MATERIAL = gql`mutation MarkLearningMaterial($id: ID!, $revision: Int!, $materialId: ID!, $status: MaterialProgress!) { updateLearningMaterial(id: $id, revision: $revision, materialId: $materialId, status: $status) { ...SavedPlanFields } } ${FIELDS}`;
export const SHARE_PLAN = gql`mutation ShareLearningPlan($id: ID!, $revision: Int!, $public: Boolean!) { setLearningPlanPublic(id: $id, revision: $revision, public: $public) { ...SavedPlanFields } } ${FIELDS}`;
export const REFRESH_PLAN = gql`mutation RefreshLearningPlan($id: ID!, $revision: Int!) { refreshLearningPlan(id: $id, revision: $revision) { ...SavedPlanFields } } ${FIELDS}`;
export const CLONE_PLAN = gql`mutation CloneLearningPlan($id: ID!, $requestId: ID!) { cloneLearningPlan(id: $id, requestId: $requestId) { id } }`;

export const REMOVE_PLAN_TASK = gql`mutation RemoveLearningPlanTask($id: ID!, $revision: Int!, $taskId: ID!) { removeLearningPlanTask(id: $id, revision: $revision, taskId: $taskId) { ...SavedPlanFields } } ${FIELDS}`;
