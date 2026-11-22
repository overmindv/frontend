/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type AppendMaterialChangeInput = {
  attachments?: Array<MaterialAttachmentInput> | null | undefined;
  expectedHeadId: string;
  message?: string;
  proposalId: string;
  source: string;
};

export type CatalogStatus =
  | 'active'
  | 'archived'
  | 'draft'
  | 'hidden';

export type CompleteMediaPartInput = {
  etag: string;
  partNumber: number;
};

export type CompleteMediaUploadInput = {
  fileId: string;
  parts?: Array<CompleteMediaPartInput> | null | undefined;
};

export type CreateCourseInput = {
  description?: string | null | undefined;
  name: string;
  programId?: string | null | undefined;
  semester?: number | null | undefined;
  slug?: string | null | undefined;
  status?: CatalogStatus | null | undefined;
  yearNumber?: number | null | undefined;
};

export type CreateMaterialDraftInput = {
  attachments?: Array<MaterialAttachmentInput> | null | undefined;
  description?: string;
  format?: MaterialFormat;
  learning?: MaterialLearningInput | null | undefined;
  message?: string;
  slug: string;
  source: string;
  tags?: Array<string>;
  title: string;
  type: MaterialType;
};

export type CreateMaterialReviewThreadInput = {
  body: string;
  lineNumber?: number;
  proposalId: string;
  revisionId: string;
};

export type CreateMediaUploadInput = {
  checksumSha256: string;
  contentType: string;
  originalName: string;
  purpose: MediaPurpose;
  sizeBytes: number;
  visibility: MediaVisibility;
};

export type CreateProgramInput = {
  degreeLevel?: DegreeLevel | null | undefined;
  faculty?: string | null | undefined;
  name: string;
  shortName?: string | null | undefined;
  startYear?: number | null | undefined;
  status?: CatalogStatus | null | undefined;
  universityId?: string | null | undefined;
};

export type CreateTopicInput = {
  courseId?: string | null | undefined;
  description?: string | null | undefined;
  difficulty?: TopicDifficulty | null | undefined;
  learningMetadata?: TopicLearningMetadataInput | null | undefined;
  orderIndex?: number | null | undefined;
  parentTopicId?: string | null | undefined;
  slug?: string | null | undefined;
  status?: CatalogStatus | null | undefined;
  title: string;
};

export type CreateUniversityInput = {
  city?: string | null | undefined;
  country?: string | null | undefined;
  logoFileId?: string | null | undefined;
  name: string;
  shortName?: string | null | undefined;
  status?: CatalogStatus | null | undefined;
  websiteUrl?: string | null | undefined;
};

export type DegreeLevel =
  | 'bachelor'
  | 'master'
  | 'other'
  | 'phd'
  | 'specialist';

export type FeedKind =
  | 'course_activated'
  | 'course_created'
  | 'material_published'
  | 'program_activated'
  | 'program_created'
  | 'task_published'
  | 'topic_activated'
  | 'topic_created'
  | 'university_activated'
  | 'university_created';

export type ItAdminTaskFilter = {
  difficulty?: ItTaskDifficulty | null | undefined;
  status?: ItTaskStatus | null | undefined;
  taskType?: ItTaskType | null | undefined;
  topicId?: string | null | undefined;
};

export type ItCodeRunMode =
  | 'graded'
  | 'samples';

export type ItCodeSubmissionInput = {
  file?: File | null | undefined;
  idempotencyKey: string;
  language: ItProgrammingLanguage;
  runMode?: ItCodeRunMode;
  sourceCode?: string | null | undefined;
  taskVersionId: string;
};

export type ItCodeSubmissionStatus =
  | 'completed'
  | 'queued';

export type ItExecutionVerdict =
  | 'accepted'
  | 'cancelled'
  | 'checker_error'
  | 'compilation_error'
  | 'infrastructure_error'
  | 'memory_limit_exceeded'
  | 'output_limit_exceeded'
  | 'runtime_error'
  | 'time_limit_exceeded'
  | 'wrong_answer';

export type ItProgrammingLanguage =
  | 'go'
  | 'python';

export type ItSubmissionInput = {
  idempotencyKey: string;
  selectedOptionIds: Array<string>;
  taskVersionId: string;
};

export type ItSubmissionVerdict =
  | 'accepted'
  | 'wrong_answer';

export type ItTaskDifficulty =
  | 'easy'
  | 'hard'
  | 'medium';

export type ItTaskExampleInput = {
  explanation?: string | null | undefined;
  input: string;
  output: string;
};

export type ItTaskFilter = {
  difficulty?: ItTaskDifficulty | null | undefined;
  search?: string | null | undefined;
  taskType?: ItTaskType | null | undefined;
  topicId?: string | null | undefined;
};

export type ItTaskInput = {
  constraints?: Array<string> | null | undefined;
  difficulty?: ItTaskDifficulty | null | undefined;
  examples?: Array<ItTaskExampleInput> | null | undefined;
  options: Array<ItTaskOptionInput>;
  statement: string;
  tags?: Array<string> | null | undefined;
  taskType: ItTaskType;
  title: string;
  topicId?: string | null | undefined;
};

export type ItTaskOptionInput = {
  isCorrect: boolean;
  text: string;
};

export type ItTaskStatus =
  | 'archived'
  | 'draft'
  | 'published';

export type ItTaskType =
  | 'multiple_choice'
  | 'programming'
  | 'single_choice';

export type LoginInput = {
  email: string;
  password: string;
  refreshSession?: boolean | null | undefined;
};

export type MaterialAssetKind =
  | 'archive'
  | 'attachment'
  | 'image'
  | 'pdf';

export type MaterialAttachmentInput = {
  fileId: string;
  kind: MaterialAssetKind;
  position?: number;
  title?: string;
};

export type MaterialChangeStatus =
  | 'closed'
  | 'merged'
  | 'open';

export type MaterialDraftMetadataInput = {
  title: string;
  topicIds: Array<string>;
};

export type MaterialFormat =
  | 'markdown'
  | 'typst';

export type MaterialLearningInput = {
  estimatedMinutes?: number;
  learningOutcomes?: Array<string>;
  topicIds?: Array<string>;
};

export type MaterialProgress =
  | 'DONE'
  | 'IN_PROGRESS'
  | 'TODO';

export type MaterialReviewDecisionKind =
  | 'approve'
  | 'request_changes';

export type MaterialReviewOutcome =
  | 'approved'
  | 'changes_requested'
  | 'pending'
  | 'waiting_candidates';

export type MaterialStatus =
  | 'archived'
  | 'draft'
  | 'published';

export type MaterialType =
  | 'article'
  | 'note'
  | 'summary'
  | 'theory';

export type MediaPurpose =
  | 'archive'
  | 'attachment'
  | 'avatar'
  | 'catalog_logo'
  | 'content_image';

export type MediaStatus =
  | 'deleted'
  | 'pending_upload'
  | 'processing'
  | 'quarantined'
  | 'ready'
  | 'rejected';

export type MediaUploadMode =
  | 'multipart'
  | 'single';

export type MediaVisibility =
  | 'private'
  | 'public';

export type OpenMaterialChangeInput = {
  attachments?: Array<MaterialAttachmentInput> | null | undefined;
  baseRevisionId: string;
  materialId: string;
  message?: string;
  source: string;
};

export type PaginationInput = {
  limit?: number | null | undefined;
  offset?: number | null | undefined;
};

export type RebaseMaterialChangeInput = {
  attachments?: Array<MaterialAttachmentInput> | null | undefined;
  baseRevisionId: string;
  expectedHeadId: string;
  message?: string;
  proposalId: string;
  source: string;
};

export type RegisterInput = {
  birthDate?: string | null | undefined;
  email: string;
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  password: string;
  phone?: string | null | undefined;
  refreshSession?: boolean | null | undefined;
  username: string;
};

export type SaveMaterialDraftInput = {
  attachments?: Array<MaterialAttachmentInput> | null | undefined;
  expectedRevisionId: string;
  format?: MaterialFormat;
  materialId: string;
  message?: string;
  metadata?: MaterialDraftMetadataInput | null | undefined;
  source: string;
};

export type StartTaskCollectionInput = {
  idempotencyKey: string;
  maxItemsPerSource?: number | null | undefined;
  publishedFrom?: string | null | undefined;
  publishedTo?: string | null | undefined;
  telegramChannels?: Array<string> | null | undefined;
  websiteUrls?: Array<string> | null | undefined;
};

export type SubmitMaterialReviewInput = {
  decision: MaterialReviewDecisionKind;
  proposalId: string;
  reason?: string;
  revisionId: string;
};

export type TaskCandidateFilter = {
  difficulty?: ItTaskDifficulty | null | undefined;
  problemListId?: string | null | undefined;
  sourceId?: string | null | undefined;
  status?: TaskCandidateStatus | null | undefined;
};

export type TaskCandidateReviewInput = {
  constraints: Array<string>;
  difficulty: ItTaskDifficulty;
  examples: Array<ItTaskExampleInput>;
  expectedRevision: number;
  statement: string;
  tags: Array<string>;
  title: string;
  topicId?: string | null | undefined;
};

export type TaskCandidateStatus =
  | 'approved'
  | 'pending'
  | 'rejected';

export type TaskCollectionJobStatus =
  | 'failed'
  | 'partial'
  | 'queued'
  | 'running'
  | 'succeeded';

export type TaskCollectionSourceStatus =
  | 'failed'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'truncated';

export type TopicDifficulty =
  | 'advanced'
  | 'basic'
  | 'hard'
  | 'intro'
  | 'medium';

export type TopicLearningMetadataInput = {
  estimatedMinutes?: number | null | undefined;
  outcomes?: Array<string>;
};

export type TopicPrerequisiteInput = {
  prerequisiteTopicId: string;
  topicId: string;
};

export type UpdateCourseInput = {
  clearProgram?: boolean | null | undefined;
  description?: string | null | undefined;
  name: string;
  programId?: string | null | undefined;
  semester?: number | null | undefined;
  slug?: string | null | undefined;
  yearNumber?: number | null | undefined;
};

export type UpdateProgramInput = {
  clearUniversity?: boolean | null | undefined;
  degreeLevel?: DegreeLevel | null | undefined;
  faculty?: string | null | undefined;
  name: string;
  shortName?: string | null | undefined;
  startYear?: number | null | undefined;
  universityId?: string | null | undefined;
};

export type UpdateTopicInput = {
  clearCourse?: boolean | null | undefined;
  clearParentTopic?: boolean | null | undefined;
  courseId?: string | null | undefined;
  description?: string | null | undefined;
  difficulty?: TopicDifficulty | null | undefined;
  learningMetadata?: TopicLearningMetadataInput | null | undefined;
  orderIndex?: number | null | undefined;
  parentTopicId?: string | null | undefined;
  slug?: string | null | undefined;
  title: string;
};

export type UpdateUniversityInput = {
  city?: string | null | undefined;
  country?: string | null | undefined;
  logoFileId?: string | null | undefined;
  name: string;
  shortName?: string | null | undefined;
  websiteUrl?: string | null | undefined;
};

export type UpdateUserInput = {
  birthDate?: string | null | undefined;
  clearBirthDate?: boolean | null | undefined;
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  phone?: string | null | undefined;
  username?: string | null | undefined;
};

export type AdminUsersQueryVariables = Exact<{
  search?: string | null | undefined;
}>;


export type AdminUsersQuery = { users: Array<{ id: string, email: string, username: string, firstName: string, lastName: string, birthDate: string | null, phone: string | null, roles: Array<string>, isAdmin: boolean, isSuperuser: boolean, createdAt: string, updatedAt: string, avatar: { fileId: string, smallUrl: string, mediumUrl: string } | null }> };

export type SetUserAdminMutationVariables = Exact<{
  id: string;
  admin: boolean;
}>;


export type SetUserAdminMutation = { setUserAdmin: { id: string, email: string, username: string, firstName: string, lastName: string, birthDate: string | null, phone: string | null, roles: Array<string>, isAdmin: boolean, isSuperuser: boolean, createdAt: string, updatedAt: string, avatar: { fileId: string, smallUrl: string, mediumUrl: string } | null } };

export type UniversityFieldsFragment = { id: string, name: string, shortName: string, city: string, country: string, websiteUrl: string, logoFileId: string | null, status: CatalogStatus, createdAt: string, updatedAt: string };

export type ProgramFieldsFragment = { id: string, universityId: string | null, name: string, shortName: string, faculty: string, degreeLevel: DegreeLevel, startYear: number | null, status: CatalogStatus, createdAt: string, updatedAt: string };

export type CourseFieldsFragment = { id: string, programId: string | null, name: string, slug: string, description: string, semester: number | null, yearNumber: number | null, status: CatalogStatus, createdAt: string, updatedAt: string };

export type TopicFieldsFragment = { id: string, courseId: string | null, parentTopicId: string | null, title: string, slug: string, description: string, orderIndex: number, difficulty: TopicDifficulty, status: CatalogStatus, createdAt: string, updatedAt: string };

export type UniversitiesQueryVariables = Exact<{
  search?: string | null | undefined;
}>;


export type UniversitiesQuery = { universities: Array<{ id: string, name: string, shortName: string, city: string, country: string, websiteUrl: string, logoFileId: string | null, status: CatalogStatus, createdAt: string, updatedAt: string }> };

export type UniversityQueryVariables = Exact<{
  id: string;
}>;


export type UniversityQuery = { university: { id: string, name: string, shortName: string, city: string, country: string, websiteUrl: string, logoFileId: string | null, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type ProgramsQueryVariables = Exact<{
  parentId?: string | null | undefined;
  search?: string | null | undefined;
}>;


export type ProgramsQuery = { programs: Array<{ id: string, universityId: string | null, name: string, shortName: string, faculty: string, degreeLevel: DegreeLevel, startYear: number | null, status: CatalogStatus, createdAt: string, updatedAt: string }> };

export type ProgramQueryVariables = Exact<{
  id: string;
}>;


export type ProgramQuery = { program: { id: string, universityId: string | null, name: string, shortName: string, faculty: string, degreeLevel: DegreeLevel, startYear: number | null, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type CoursesQueryVariables = Exact<{
  parentId?: string | null | undefined;
  search?: string | null | undefined;
}>;


export type CoursesQuery = { courses: Array<{ id: string, programId: string | null, name: string, slug: string, description: string, semester: number | null, yearNumber: number | null, status: CatalogStatus, createdAt: string, updatedAt: string }> };

export type CourseQueryVariables = Exact<{
  id: string;
}>;


export type CourseQuery = { course: { id: string, programId: string | null, name: string, slug: string, description: string, semester: number | null, yearNumber: number | null, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type TopicsQueryVariables = Exact<{
  parentId?: string | null | undefined;
  search?: string | null | undefined;
}>;


export type TopicsQuery = { topics: Array<{ id: string, courseId: string | null, parentTopicId: string | null, title: string, slug: string, description: string, orderIndex: number, difficulty: TopicDifficulty, status: CatalogStatus, createdAt: string, updatedAt: string }>, topicTree: Array<{ topic: { id: string, courseId: string | null, parentTopicId: string | null, title: string, slug: string, description: string, orderIndex: number, difficulty: TopicDifficulty, status: CatalogStatus, createdAt: string, updatedAt: string }, children: Array<{ topic: { id: string, courseId: string | null, parentTopicId: string | null, title: string, slug: string, description: string, orderIndex: number, difficulty: TopicDifficulty, status: CatalogStatus, createdAt: string, updatedAt: string }, children: Array<{ topic: { id: string, courseId: string | null, parentTopicId: string | null, title: string, slug: string, description: string, orderIndex: number, difficulty: TopicDifficulty, status: CatalogStatus, createdAt: string, updatedAt: string } }> }> }> };

export type TopicQueryVariables = Exact<{
  id: string;
}>;


export type TopicQuery = { topic: { id: string, courseId: string | null, parentTopicId: string | null, title: string, slug: string, description: string, orderIndex: number, difficulty: TopicDifficulty, status: CatalogStatus, createdAt: string, updatedAt: string }, topicPrerequisites: Array<{ topicId: string, prerequisiteTopicId: string, createdAt: string }> };

export type CreateUniversityMutationVariables = Exact<{
  input: CreateUniversityInput;
}>;


export type CreateUniversityMutation = { createUniversity: { id: string, name: string, shortName: string, city: string, country: string, websiteUrl: string, logoFileId: string | null, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type UpdateUniversityMutationVariables = Exact<{
  id: string;
  input: UpdateUniversityInput;
}>;


export type UpdateUniversityMutation = { updateUniversity: { id: string, name: string, shortName: string, city: string, country: string, websiteUrl: string, logoFileId: string | null, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type CreateProgramMutationVariables = Exact<{
  input: CreateProgramInput;
}>;


export type CreateProgramMutation = { createProgram: { id: string, universityId: string | null, name: string, shortName: string, faculty: string, degreeLevel: DegreeLevel, startYear: number | null, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type UpdateProgramMutationVariables = Exact<{
  id: string;
  input: UpdateProgramInput;
}>;


export type UpdateProgramMutation = { updateProgram: { id: string, universityId: string | null, name: string, shortName: string, faculty: string, degreeLevel: DegreeLevel, startYear: number | null, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type CreateCourseMutationVariables = Exact<{
  input: CreateCourseInput;
}>;


export type CreateCourseMutation = { createCourse: { id: string, programId: string | null, name: string, slug: string, description: string, semester: number | null, yearNumber: number | null, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type UpdateCourseMutationVariables = Exact<{
  id: string;
  input: UpdateCourseInput;
}>;


export type UpdateCourseMutation = { updateCourse: { id: string, programId: string | null, name: string, slug: string, description: string, semester: number | null, yearNumber: number | null, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type CreateTopicMutationVariables = Exact<{
  input: CreateTopicInput;
}>;


export type CreateTopicMutation = { createTopic: { id: string, courseId: string | null, parentTopicId: string | null, title: string, slug: string, description: string, orderIndex: number, difficulty: TopicDifficulty, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type UpdateTopicMutationVariables = Exact<{
  id: string;
  input: UpdateTopicInput;
}>;


export type UpdateTopicMutation = { updateTopic: { id: string, courseId: string | null, parentTopicId: string | null, title: string, slug: string, description: string, orderIndex: number, difficulty: TopicDifficulty, status: CatalogStatus, createdAt: string, updatedAt: string } };

export type DeleteUniversityMutationVariables = Exact<{
  id: string;
}>;


export type DeleteUniversityMutation = { deleteUniversity: boolean };

export type DeleteProgramMutationVariables = Exact<{
  id: string;
}>;


export type DeleteProgramMutation = { deleteProgram: boolean };

export type DeleteCourseMutationVariables = Exact<{
  id: string;
}>;


export type DeleteCourseMutation = { deleteCourse: boolean };

export type DeleteTopicMutationVariables = Exact<{
  id: string;
}>;


export type DeleteTopicMutation = { deleteTopic: boolean };

export type ChangeUniversityStatusMutationVariables = Exact<{
  id: string;
  status: CatalogStatus;
}>;


export type ChangeUniversityStatusMutation = { changeUniversityStatus: { id: string, status: CatalogStatus } };

export type ChangeProgramStatusMutationVariables = Exact<{
  id: string;
  status: CatalogStatus;
}>;


export type ChangeProgramStatusMutation = { changeProgramStatus: { id: string, status: CatalogStatus } };

export type ChangeCourseStatusMutationVariables = Exact<{
  id: string;
  status: CatalogStatus;
}>;


export type ChangeCourseStatusMutation = { changeCourseStatus: { id: string, status: CatalogStatus } };

export type ChangeTopicStatusMutationVariables = Exact<{
  id: string;
  status: CatalogStatus;
}>;


export type ChangeTopicStatusMutation = { changeTopicStatus: { id: string, status: CatalogStatus } };

export type AddPrerequisiteMutationVariables = Exact<{
  input: TopicPrerequisiteInput;
}>;


export type AddPrerequisiteMutation = { addTopicPrerequisite: { topicId: string, prerequisiteTopicId: string, createdAt: string } };

export type RemovePrerequisiteMutationVariables = Exact<{
  input: TopicPrerequisiteInput;
}>;


export type RemovePrerequisiteMutation = { removeTopicPrerequisite: boolean };

export type TaskCandidateFieldsFragment = { id: string, status: TaskCandidateStatus, revision: number, externalId: string, sourceId: string, sourceName: string, sourceUrl: string, sourcePublishedAt: string | null, retrievedAt: string, collectionJobId: string, topicId: string | null, problemListId: string | null, title: string, statement: string, difficulty: ItTaskDifficulty, tags: Array<string>, constraints: Array<string>, approvedTaskId: string | null, rejectionReason: string, createdAt: string, updatedAt: string, examples: Array<{ input: string, output: string, explanation: string }> };

export type TaskCollectionJobFieldsFragment = { id: string, trigger: string, requestedBy: string | null, status: TaskCollectionJobStatus, collectedTotal: number, importedTotal: number, duplicatesTotal: number, invalidTotal: number, errorCount: number, errorMessage: string, notificationAcknowledged: boolean, createdAt: string, finishedAt: string | null };

export type TaskCollectionSourcesQueryVariables = Exact<{ [key: string]: never; }>;


export type TaskCollectionSourcesQuery = { taskCollectionSources: { telegramChannels: Array<string>, websiteSources: Array<string> } };

export type TaskCollectionJobsQueryVariables = Exact<{
  unreadOnly?: boolean | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type TaskCollectionJobsQuery = { taskCollectionJobs: { limit: number, offset: number, items: Array<{ id: string, trigger: string, requestedBy: string | null, status: TaskCollectionJobStatus, collectedTotal: number, importedTotal: number, duplicatesTotal: number, invalidTotal: number, errorCount: number, errorMessage: string, notificationAcknowledged: boolean, createdAt: string, finishedAt: string | null }> } };

export type TaskCollectionJobQueryVariables = Exact<{
  id: string;
}>;


export type TaskCollectionJobQuery = { taskCollectionJob: { id: string, trigger: string, requestedBy: string | null, status: TaskCollectionJobStatus, collectedTotal: number, importedTotal: number, duplicatesTotal: number, invalidTotal: number, errorCount: number, errorMessage: string, notificationAcknowledged: boolean, createdAt: string, finishedAt: string | null, sources: Array<{ id: string, kind: string, sourceId: string, url: string, status: TaskCollectionSourceStatus, collectedTotal: number, importedTotal: number, duplicatesTotal: number, invalidTotal: number, errorMessage: string }> } };

export type StartTaskCollectionMutationVariables = Exact<{
  input: StartTaskCollectionInput;
}>;


export type StartTaskCollectionMutation = { startTaskCollection: { id: string, trigger: string, requestedBy: string | null, status: TaskCollectionJobStatus, collectedTotal: number, importedTotal: number, duplicatesTotal: number, invalidTotal: number, errorCount: number, errorMessage: string, notificationAcknowledged: boolean, createdAt: string, finishedAt: string | null } };

export type AcknowledgeTaskCollectionJobMutationVariables = Exact<{
  id: string;
}>;


export type AcknowledgeTaskCollectionJobMutation = { acknowledgeTaskCollectionJob: boolean };

export type ProblemListFieldsFragment = { id: string, name: string, sourceId: string, sourceUrl: string, memberCount: number, pendingCandidates: number, createdAt: string, updatedAt: string };

export type ProblemListsQueryVariables = Exact<{
  pagination?: PaginationInput | null | undefined;
}>;


export type ProblemListsQuery = { problemLists: { limit: number, offset: number, items: Array<{ id: string, name: string, sourceId: string, sourceUrl: string, memberCount: number, pendingCandidates: number, createdAt: string, updatedAt: string }> } };

export type ProblemListQueryVariables = Exact<{
  id: string;
}>;


export type ProblemListQuery = { problemList: { id: string, name: string, sourceId: string, sourceUrl: string, memberCount: number, pendingCandidates: number, createdAt: string, updatedAt: string, members: Array<{ taskId: string, title: string, difficulty: ItTaskDifficulty, status: ItTaskStatus }> } };

export type TaskCandidatesQueryVariables = Exact<{
  filter?: TaskCandidateFilter | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type TaskCandidatesQuery = { taskCandidates: { limit: number, offset: number, items: Array<{ id: string, status: TaskCandidateStatus, revision: number, externalId: string, sourceId: string, sourceName: string, sourceUrl: string, sourcePublishedAt: string | null, retrievedAt: string, collectionJobId: string, topicId: string | null, problemListId: string | null, title: string, statement: string, difficulty: ItTaskDifficulty, tags: Array<string>, constraints: Array<string>, approvedTaskId: string | null, rejectionReason: string, createdAt: string, updatedAt: string, examples: Array<{ input: string, output: string, explanation: string }> }> } };

export type TaskCandidateQueryVariables = Exact<{
  id: string;
}>;


export type TaskCandidateQuery = { taskCandidate: { id: string, status: TaskCandidateStatus, revision: number, externalId: string, sourceId: string, sourceName: string, sourceUrl: string, sourcePublishedAt: string | null, retrievedAt: string, collectionJobId: string, topicId: string | null, problemListId: string | null, title: string, statement: string, difficulty: ItTaskDifficulty, tags: Array<string>, constraints: Array<string>, approvedTaskId: string | null, rejectionReason: string, createdAt: string, updatedAt: string, examples: Array<{ input: string, output: string, explanation: string }> } };

export type UpdateTaskCandidateMutationVariables = Exact<{
  id: string;
  input: TaskCandidateReviewInput;
}>;


export type UpdateTaskCandidateMutation = { updateTaskCandidate: { id: string, status: TaskCandidateStatus, revision: number, externalId: string, sourceId: string, sourceName: string, sourceUrl: string, sourcePublishedAt: string | null, retrievedAt: string, collectionJobId: string, topicId: string | null, problemListId: string | null, title: string, statement: string, difficulty: ItTaskDifficulty, tags: Array<string>, constraints: Array<string>, approvedTaskId: string | null, rejectionReason: string, createdAt: string, updatedAt: string, examples: Array<{ input: string, output: string, explanation: string }> } };

export type ApproveTaskCandidateMutationVariables = Exact<{
  id: string;
  input: TaskCandidateReviewInput;
}>;


export type ApproveTaskCandidateMutation = { approveTaskCandidate: { id: string, status: ItTaskStatus, taskType: ItTaskType } };

export type RejectTaskCandidateMutationVariables = Exact<{
  id: string;
  expectedRevision: number;
  reason?: string | null | undefined;
}>;


export type RejectTaskCandidateMutation = { rejectTaskCandidate: { id: string, status: TaskCandidateStatus, revision: number, externalId: string, sourceId: string, sourceName: string, sourceUrl: string, sourcePublishedAt: string | null, retrievedAt: string, collectionJobId: string, topicId: string | null, problemListId: string | null, title: string, statement: string, difficulty: ItTaskDifficulty, tags: Array<string>, constraints: Array<string>, approvedTaskId: string | null, rejectionReason: string, createdAt: string, updatedAt: string, examples: Array<{ input: string, output: string, explanation: string }> } };

export type FeedQueryVariables = Exact<{
  pagination?: PaginationInput | null | undefined;
}>;


export type FeedQuery = { feed: { limit: number, offset: number, items: Array<{ id: string, kind: FeedKind, title: string, text: string, href: string, actorUserId: string, occurredAt: string }> } };

export type MaterialChangeQueryVariables = Exact<{
  id: string;
  includeSource: boolean;
}>;


export type MaterialChangeQuery = { materialChangeProposal: { id: string, materialId: string, authorId: string, baseRevisionId: string, status: MaterialChangeStatus, baseOutdated: boolean, createdAt: string, head: { id: string, ordinal: number, message: string, createdAt: string, source?: string } } | null };

export type MaterialChangeHistoryQueryVariables = Exact<{
  id: string;
  before?: number | null | undefined;
}>;


export type MaterialChangeHistoryQuery = { materialChangeHistory: { nextBeforeOrdinal: number | null, items: Array<{ id: string, ordinal: number, authorId: string, message: string, createdAt: string, baseRevisionId: string }> } | null };

export type MaterialChangeDiffQueryVariables = Exact<{
  id: string;
  revisionId: string;
}>;


export type MaterialChangeDiffQuery = { materialChangeDiff: { baseRevisionId: string, revisionId: string, unifiedDiff: string, truncated: boolean } | null };

export type OpenMaterialChangeMutationVariables = Exact<{
  input: OpenMaterialChangeInput;
}>;


export type OpenMaterialChangeMutation = { openMaterialChange: { id: string } | null };

export type AppendMaterialChangeMutationVariables = Exact<{
  input: AppendMaterialChangeInput;
}>;


export type AppendMaterialChangeMutation = { appendMaterialChange: { id: string, head: { id: string, ordinal: number, source: string } } | null };

export type CloseMaterialChangeMutationVariables = Exact<{
  id: string;
}>;


export type CloseMaterialChangeMutation = { closeMaterialChange: { id: string, status: MaterialChangeStatus } | null };

export type ChangeAuthorQueryVariables = Exact<{
  id: string;
}>;


export type ChangeAuthorQuery = { userProfile: { id: string, username: string } };

export type MyMaterialDraftsQueryVariables = Exact<{
  authorId: string;
  topicId?: string | null | undefined;
  cursor?: string | null | undefined;
}>;


export type MyMaterialDraftsQuery = { materials: { nextCursor: string | null, items: Array<{ id: string, title: string, createdAt: string, learning: { estimatedMinutes: number } | null }> } | null };

export type MaterialDraftQueryVariables = Exact<{
  id: string;
}>;


export type MaterialDraftQuery = { material: { id: string, title: string, status: MaterialStatus, authorId: string | null, revision: { id: string, number: number, format: MaterialFormat, source: string } | null, attachments: Array<{ fileId: string, kind: MaterialAssetKind, title: string, position: number }>, learning: { topicIds: Array<string> } | null } | null };

export type CreateMaterialDraftMutationVariables = Exact<{
  input: CreateMaterialDraftInput;
}>;


export type CreateMaterialDraftMutation = { createMaterialDraft: { id: string, title: string, revision: { id: string, number: number, format: MaterialFormat, source: string } | null } | null };

export type SaveMaterialDraftMutationVariables = Exact<{
  input: SaveMaterialDraftInput;
}>;


export type SaveMaterialDraftMutation = { saveMaterialDraft: { id: string, number: number, format: MaterialFormat, source: string } | null };

export type MaterialTopicSearchQueryVariables = Exact<{
  search: string;
  offset: number;
}>;


export type MaterialTopicSearchQuery = { topics: Array<{ id: string, title: string }> };

export type MaterialTopicLabelQueryVariables = Exact<{
  id: string;
}>;


export type MaterialTopicLabelQuery = { topic: { id: string, title: string } };

export type MaterialReviewStatusQueryVariables = Exact<{
  id: string;
  revisionId: string;
}>;


export type MaterialReviewStatusQuery = { materialReviewStatus: { revisionId: string, current: boolean, outcome: MaterialReviewOutcome, waitReason: string | null, assignments: Array<{ reviewerId: string, slot: number }>, decisions: Array<{ reviewerId: string, decision: MaterialReviewDecisionKind, reason: string, createdAt: string, legacy: boolean }> } | null };

export type MaterialReviewThreadsQueryVariables = Exact<{
  id: string;
  after?: string | null | undefined;
}>;


export type MaterialReviewThreadsQuery = { materialReviewThreads: { nextAfterId: string | null, items: Array<{ id: string, revisionId: string, lineNumber: number, authorId: string, body: string, createdAt: string, resolved: boolean }> } | null };

export type MaterialReviewRepliesQueryVariables = Exact<{
  id: string;
  threadId: string;
  after?: string | null | undefined;
}>;


export type MaterialReviewRepliesQuery = { materialReviewReplies: { nextAfterId: string | null, items: Array<{ id: string, authorId: string, body: string, createdAt: string }> } | null };

export type SubmitMaterialReviewMutationVariables = Exact<{
  input: SubmitMaterialReviewInput;
}>;


export type SubmitMaterialReviewMutation = { submitMaterialReview: { reviewerId: string, decision: MaterialReviewDecisionKind } | null };

export type CreateMaterialReviewThreadMutationVariables = Exact<{
  input: CreateMaterialReviewThreadInput;
}>;


export type CreateMaterialReviewThreadMutation = { createMaterialReviewThread: { id: string, revisionId: string, lineNumber: number, authorId: string, body: string, createdAt: string, resolved: boolean } | null };

export type ReplyToMaterialReviewThreadMutationVariables = Exact<{
  id: string;
  threadId: string;
  body: string;
}>;


export type ReplyToMaterialReviewThreadMutation = { replyToMaterialReviewThread: { id: string, authorId: string, body: string, createdAt: string } | null };

export type SetMaterialReviewThreadResolvedMutationVariables = Exact<{
  id: string;
  threadId: string;
  resolved: boolean;
}>;


export type SetMaterialReviewThreadResolvedMutation = { setMaterialReviewThreadResolved: { id: string, resolved: boolean } | null };

export type MergeMaterialChangeMutationVariables = Exact<{
  id: string;
  expectedHeadId: string;
}>;


export type MergeMaterialChangeMutation = { mergeMaterialChange: { materialId: string, publishedRevisionId: string } | null };

export type RebaseMaterialChangeMutationVariables = Exact<{
  input: RebaseMaterialChangeInput;
}>;


export type RebaseMaterialChangeMutation = { rebaseMaterialChange: { id: string, baseRevisionId: string, head: { id: string, ordinal: number, source: string } } | null };

export type MaterialReviewPublicationQueryVariables = Exact<{
  id: string;
}>;


export type MaterialReviewPublicationQuery = { publishedMaterial: { id: string, authorId: string | null, publishedRevisionId: string | null } | null };

export type MaterialsQueryVariables = Exact<{
  topicId?: string | null | undefined;
  cursor?: string | null | undefined;
}>;


export type MaterialsQuery = { materials: { nextCursor: string | null, items: Array<{ id: string, title: string, createdAt: string, learning: { estimatedMinutes: number } | null }> } | null };

export type MaterialTopicsQueryVariables = Exact<{ [key: string]: never; }>;


export type MaterialTopicsQuery = { topics: Array<{ id: string, title: string }> };

export type PublishedMaterialQueryVariables = Exact<{
  id: string;
}>;


export type PublishedMaterialQuery = { publishedMaterial: { id: string, title: string, description: string, status: MaterialStatus, authorId: string | null, publishedAt: string | null, publishedRevisionId: string | null, revision: { id: string, number: number, format: MaterialFormat, source: string } | null, attachments: Array<{ fileId: string, kind: MaterialAssetKind, title: string, position: number }>, learning: { estimatedMinutes: number, topicIds: Array<string>, learningOutcomes: Array<string> } | null } | null };

export type MaterialHistoryQueryVariables = Exact<{
  id: string;
  before?: number | null | undefined;
}>;


export type MaterialHistoryQuery = { materialRevisions: { nextBeforeRevision: number | null, items: Array<{ id: string, number: number, message: string, createdAt: string }> } | null };

export type MaterialDownloadQueryVariables = Exact<{
  materialId: string;
  revisionId: string;
  fileId: string;
}>;


export type MaterialDownloadQuery = { publishedMaterialAttachmentDownload: { url: string, expiresAt: string } | null };

export type UserFieldsFragment = { id: string, email: string, username: string, firstName: string, lastName: string, birthDate: string | null, phone: string | null, roles: Array<string>, isAdmin: boolean, isSuperuser: boolean, createdAt: string, updatedAt: string, avatar: { fileId: string, smallUrl: string, mediumUrl: string } | null };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutation = { register: { token: string, expiresAt: string, user: { id: string, email: string, username: string, firstName: string, lastName: string, birthDate: string | null, phone: string | null, roles: Array<string>, isAdmin: boolean, isSuperuser: boolean, createdAt: string, updatedAt: string, avatar: { fileId: string, smallUrl: string, mediumUrl: string } | null } } };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { login: { token: string, expiresAt: string, user: { id: string, email: string, username: string, firstName: string, lastName: string, birthDate: string | null, phone: string | null, roles: Array<string>, isAdmin: boolean, isSuperuser: boolean, createdAt: string, updatedAt: string, avatar: { fileId: string, smallUrl: string, mediumUrl: string } | null } } };

export type UpdateUserMutationVariables = Exact<{
  id: string;
  input: UpdateUserInput;
}>;


export type UpdateUserMutation = { updateUser: { id: string, email: string, username: string, firstName: string, lastName: string, birthDate: string | null, phone: string | null, roles: Array<string>, isAdmin: boolean, isSuperuser: boolean, createdAt: string, updatedAt: string, avatar: { fileId: string, smallUrl: string, mediumUrl: string } | null } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { logout: boolean };

export type CreateMediaUploadMutationVariables = Exact<{
  input: CreateMediaUploadInput;
}>;


export type CreateMediaUploadMutation = { createMediaUpload: { fileId: string, mode: MediaUploadMode, url: string, multipartUploadId: string, partSize: number, expiresAt: string, fields: Array<{ name: string, value: string }>, headers: Array<{ name: string, value: string }> } };

export type CompleteMediaUploadMutationVariables = Exact<{
  input: CompleteMediaUploadInput;
}>;


export type CompleteMediaUploadMutation = { completeMediaUpload: { id: string, status: MediaStatus } };

export type SetMyAvatarMutationVariables = Exact<{
  fileId?: string | null | undefined;
}>;


export type SetMyAvatarMutation = { setMyAvatar: { id: string, email: string, username: string, firstName: string, lastName: string, birthDate: string | null, phone: string | null, roles: Array<string>, isAdmin: boolean, isSuperuser: boolean, createdAt: string, updatedAt: string, avatar: { fileId: string, smallUrl: string, mediumUrl: string } | null } };

export type MyPracticeGoalQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPracticeGoalQuery = { myPracticeGoal: { minutes: number, sessionCount: number, revision: number, topics: Array<{ id: string, title: string, status: string }> } | null };

export type SavePracticeGoalMutationVariables = Exact<{
  topicIds: Array<string> | string;
  minutes: number;
  sessionCount?: number | null | undefined;
}>;


export type SavePracticeGoalMutation = { savePracticeGoal: { minutes: number, sessionCount: number, revision: number, topics: Array<{ id: string, title: string, status: string }> } };

export type DeletePracticeGoalMutationVariables = Exact<{ [key: string]: never; }>;


export type DeletePracticeGoalMutation = { deletePracticeGoal: boolean };

export type PracticePlanQueryVariables = Exact<{
  topicIds: Array<string> | string;
  minutes: number;
  sessionCount?: number | null | undefined;
  goal?: string | null | undefined;
}>;


export type PracticePlanQuery = { practicePlan: { aiStatus: string, policyVersion: string, totalMinutes: number, warnings: Array<string>, requestedSessions: number, totalPlannedMinutes: number, sessions: Array<{ number: number, totalMinutes: number, items: Array<{ taskId: string, taskVersionId: string, topicId: string, title: string, difficulty: string, taskType: string, estimatedMinutes: number, reasonCode: string }> }>, topicInsights: Array<{ topicId: string, title: string, isTarget: boolean, acceptedTasks: number, failedTasks: number, eligibleTasks: number, plannedTasks: number, remainingToReadiness: number, recommendedDifficulty: string, minimumMinutes: number, nextAction: string, blockedBy: Array<{ id: string, title: string }> }>, items: Array<{ taskId: string, taskVersionId: string, topicId: string, title: string, difficulty: string, taskType: string, estimatedMinutes: number, reasonCode: string }> } };

export type PracticeTopicsQueryVariables = Exact<{
  search: string;
  limit: number;
  offset: number;
}>;


export type PracticeTopicsQuery = { topics: Array<{ id: string, title: string, status: CatalogStatus }> };

export type ProgressFieldsFragment = { userId: string, public: boolean, attempts: number, acceptedAttempts: number, solvedTasks: number, score: number, accuracyPercent: number, daily: Array<{ date: string, attempts: number, accepted: number }>, byDifficulty: Array<{ difficulty: string, solved: number }> };

export type MyPracticeProgressQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPracticeProgressQuery = { myPracticeProgress: { userId: string, public: boolean, attempts: number, acceptedAttempts: number, solvedTasks: number, score: number, accuracyPercent: number, daily: Array<{ date: string, attempts: number, accepted: number }>, byDifficulty: Array<{ difficulty: string, solved: number }> } };

export type UserPracticeProgressQueryVariables = Exact<{
  userId: string;
}>;


export type UserPracticeProgressQuery = { practiceProgress: { userId: string, public: boolean, attempts: number, acceptedAttempts: number, solvedTasks: number, score: number, accuracyPercent: number, daily: Array<{ date: string, attempts: number, accepted: number }>, byDifficulty: Array<{ difficulty: string, solved: number }> } | null };

export type SetMyPracticeStatsPublicMutationVariables = Exact<{
  public: boolean;
}>;


export type SetMyPracticeStatsPublicMutation = { setMyPracticeStatsPublic: boolean };

export type PracticeLeaderboardQueryVariables = Exact<{
  courseId?: string | null | undefined;
}>;


export type PracticeLeaderboardQuery = { practiceLeaderboard: Array<{ rank: number, userId: string, username: string, displayName: string, score: number, solvedTasks: number }> };

export type RatingCoursesQueryVariables = Exact<{
  search: string;
}>;


export type RatingCoursesQuery = { courses: Array<{ id: string, name: string, status: CatalogStatus }> };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, isAdmin: boolean, isSuperuser: boolean } };

export type GetUserQueryVariables = Exact<{
  id: string;
}>;


export type GetUserQuery = { getUser: { id: string, email: string, username: string, firstName: string, lastName: string, birthDate: string | null, phone: string | null, roles: Array<string>, isAdmin: boolean, isSuperuser: boolean, createdAt: string, updatedAt: string, avatar: { fileId: string, smallUrl: string, mediumUrl: string } | null } };

export type PublicUserProfileQueryVariables = Exact<{
  id: string;
}>;


export type PublicUserProfileQuery = { userProfile: { id: string, username: string, firstName: string, lastName: string, isAdmin: boolean, createdAt: string, avatar: { smallUrl: string, mediumUrl: string } | null } };

export type MediaFileQueryVariables = Exact<{
  id: string;
}>;


export type MediaFileQuery = { mediaFile: { id: string, status: MediaStatus, purpose: MediaPurpose } };

export type SavedPlanFieldsFragment = { id: string, goal: string, isOwner: boolean, public: boolean, revision: number, minutes: number, sessionCount: number, progressAvailable: boolean, materials: Array<{ id: string, title: string, url: string, action: string, minutes: number, status: MaterialProgress }>, tasks: Array<{ id: string, versionId: string, title: string, minutes: number, completed: boolean, completionVersionId: string | null }> };

export type SavedLearningPlanQueryVariables = Exact<{
  id: string;
}>;


export type SavedLearningPlanQuery = { savedLearningPlan: { id: string, goal: string, isOwner: boolean, public: boolean, revision: number, minutes: number, sessionCount: number, progressAvailable: boolean, materials: Array<{ id: string, title: string, url: string, action: string, minutes: number, status: MaterialProgress }>, tasks: Array<{ id: string, versionId: string, title: string, minutes: number, completed: boolean, completionVersionId: string | null }> } };

export type MyLearningPlansQueryVariables = Exact<{ [key: string]: never; }>;


export type MyLearningPlansQuery = { myLearningPlans: Array<{ id: string, goal: string, public: boolean, materials: Array<{ id: string, status: MaterialProgress }>, tasks: Array<{ id: string }> }> };

export type SaveLearningPlanMutationVariables = Exact<{
  goal: string;
  minutes: number;
  sessionCount: number;
  requestId: string;
}>;


export type SaveLearningPlanMutation = { saveLearningPlan: { id: string } };

export type MarkLearningMaterialMutationVariables = Exact<{
  id: string;
  revision: number;
  materialId: string;
  status: MaterialProgress;
}>;


export type MarkLearningMaterialMutation = { updateLearningMaterial: { id: string, goal: string, isOwner: boolean, public: boolean, revision: number, minutes: number, sessionCount: number, progressAvailable: boolean, materials: Array<{ id: string, title: string, url: string, action: string, minutes: number, status: MaterialProgress }>, tasks: Array<{ id: string, versionId: string, title: string, minutes: number, completed: boolean, completionVersionId: string | null }> } };

export type ShareLearningPlanMutationVariables = Exact<{
  id: string;
  revision: number;
  public: boolean;
}>;


export type ShareLearningPlanMutation = { setLearningPlanPublic: { id: string, goal: string, isOwner: boolean, public: boolean, revision: number, minutes: number, sessionCount: number, progressAvailable: boolean, materials: Array<{ id: string, title: string, url: string, action: string, minutes: number, status: MaterialProgress }>, tasks: Array<{ id: string, versionId: string, title: string, minutes: number, completed: boolean, completionVersionId: string | null }> } };

export type RefreshLearningPlanMutationVariables = Exact<{
  id: string;
  revision: number;
}>;


export type RefreshLearningPlanMutation = { refreshLearningPlan: { id: string, goal: string, isOwner: boolean, public: boolean, revision: number, minutes: number, sessionCount: number, progressAvailable: boolean, materials: Array<{ id: string, title: string, url: string, action: string, minutes: number, status: MaterialProgress }>, tasks: Array<{ id: string, versionId: string, title: string, minutes: number, completed: boolean, completionVersionId: string | null }> } };

export type CloneLearningPlanMutationVariables = Exact<{
  id: string;
  requestId: string;
}>;


export type CloneLearningPlanMutation = { cloneLearningPlan: { id: string } };

export type RemoveLearningPlanTaskMutationVariables = Exact<{
  id: string;
  revision: number;
  taskId: string;
}>;


export type RemoveLearningPlanTaskMutation = { removeLearningPlanTask: { id: string, goal: string, isOwner: boolean, public: boolean, revision: number, minutes: number, sessionCount: number, progressAvailable: boolean, materials: Array<{ id: string, title: string, url: string, action: string, minutes: number, status: MaterialProgress }>, tasks: Array<{ id: string, versionId: string, title: string, minutes: number, completed: boolean, completionVersionId: string | null }> } };

export type SearchQueryVariables = Exact<{
  query: string;
  limit: number;
}>;


export type SearchQuery = { search: { universities: Array<{ id: string, name: string, shortName: string, city: string, country: string, websiteUrl: string, logoFileId: string | null, status: CatalogStatus, createdAt: string, updatedAt: string }>, programs: Array<{ id: string, universityId: string | null, name: string, shortName: string, faculty: string, degreeLevel: DegreeLevel, startYear: number | null, status: CatalogStatus, createdAt: string, updatedAt: string }>, courses: Array<{ id: string, programId: string | null, name: string, slug: string, description: string, semester: number | null, yearNumber: number | null, status: CatalogStatus, createdAt: string, updatedAt: string }>, topics: Array<{ id: string, courseId: string | null, parentTopicId: string | null, title: string, slug: string, description: string, orderIndex: number, difficulty: TopicDifficulty, status: CatalogStatus, createdAt: string, updatedAt: string }>, tasks: Array<{ id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string }> } };

export type ItTaskSummaryFieldsFragment = { id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string };

export type ItTaskFieldsFragment = { id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, statement: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string, tags: Array<string>, constraints: Array<string>, options: Array<{ id: string, text: string, position: number, isCorrect: boolean | null }>, examples: Array<{ input: string, output: string, explanation: string }>, source: { sourceId: string, sourceName: string, sourceUrl: string, publishedAt: string | null } | null };

export type ItSubmissionFieldsFragment = { id: string, userId: string, taskId: string, taskVersionId: string, taskTitle: string, taskVersionNumber: number, selectedOptionIds: Array<string>, correctOptionIds: Array<string>, correct: boolean, verdict: ItSubmissionVerdict, taskUpdated: boolean, latestTaskVersionId: string, latestVersionNumber: number, createdAt: string };

export type ItCodeSubmissionFieldsFragment = { runMode: ItCodeRunMode, id: string, userId: string, taskId: string, taskVersionId: string, taskVersionNumber: number, executionId: string, correlationId: string, language: ItProgrammingLanguage, sourceFileName: string, status: ItCodeSubmissionStatus, verdict: ItExecutionVerdict | null, createdAt: string, updatedAt: string, completedAt: string | null, compilation: { exitCode: number | null, stdout: string, stderr: string, durationMs: number, memoryBytes: number } | null, execution: { exitCode: number | null, stdout: string, stderr: string, durationMs: number, memoryBytes: number } | null, tests: Array<{ testId: string, verdict: ItExecutionVerdict, stdout: string, stderr: string, durationMs: number, memoryBytes: number }>, failure: { code: string, message: string } | null };

export type ItTasksQueryVariables = Exact<{
  filter?: ItTaskFilter | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type ItTasksQuery = { itTasks: { limit: number, offset: number, items: Array<{ id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string }> } };

export type ItTaskQueryVariables = Exact<{
  id: string;
}>;


export type ItTaskQuery = { itTask: { id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, statement: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string, tags: Array<string>, constraints: Array<string>, options: Array<{ id: string, text: string, position: number, isCorrect: boolean | null }>, examples: Array<{ input: string, output: string, explanation: string }>, source: { sourceId: string, sourceName: string, sourceUrl: string, publishedAt: string | null } | null } };

export type ItTaskTopicsQueryVariables = Exact<{ [key: string]: never; }>;


export type ItTaskTopicsQuery = { topics: Array<{ id: string, title: string }> };

export type AdminItTasksQueryVariables = Exact<{
  filter?: ItAdminTaskFilter | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type AdminItTasksQuery = { adminITTasks: { limit: number, offset: number, items: Array<{ id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string }> } };

export type AdminItTaskQueryVariables = Exact<{
  id: string;
}>;


export type AdminItTaskQuery = { adminITTask: { id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, statement: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string, tags: Array<string>, constraints: Array<string>, options: Array<{ id: string, text: string, position: number, isCorrect: boolean | null }>, examples: Array<{ input: string, output: string, explanation: string }>, source: { sourceId: string, sourceName: string, sourceUrl: string, publishedAt: string | null } | null } };

export type ItSubmissionQueryVariables = Exact<{
  id: string;
}>;


export type ItSubmissionQuery = { itSubmission: { id: string, userId: string, taskId: string, taskVersionId: string, taskTitle: string, taskVersionNumber: number, selectedOptionIds: Array<string>, correctOptionIds: Array<string>, correct: boolean, verdict: ItSubmissionVerdict, taskUpdated: boolean, latestTaskVersionId: string, latestVersionNumber: number, createdAt: string } };

export type MyItSubmissionsQueryVariables = Exact<{
  taskId?: string | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type MyItSubmissionsQuery = { myITSubmissions: { limit: number, offset: number, items: Array<{ id: string, userId: string, taskId: string, taskVersionId: string, taskTitle: string, taskVersionNumber: number, selectedOptionIds: Array<string>, correctOptionIds: Array<string>, correct: boolean, verdict: ItSubmissionVerdict, taskUpdated: boolean, latestTaskVersionId: string, latestVersionNumber: number, createdAt: string }> } };

export type ItCodeSubmissionQueryVariables = Exact<{
  id: string;
}>;


export type ItCodeSubmissionQuery = { itCodeSubmission: { runMode: ItCodeRunMode, id: string, userId: string, taskId: string, taskVersionId: string, taskVersionNumber: number, executionId: string, correlationId: string, language: ItProgrammingLanguage, sourceFileName: string, status: ItCodeSubmissionStatus, verdict: ItExecutionVerdict | null, createdAt: string, updatedAt: string, completedAt: string | null, compilation: { exitCode: number | null, stdout: string, stderr: string, durationMs: number, memoryBytes: number } | null, execution: { exitCode: number | null, stdout: string, stderr: string, durationMs: number, memoryBytes: number } | null, tests: Array<{ testId: string, verdict: ItExecutionVerdict, stdout: string, stderr: string, durationMs: number, memoryBytes: number }>, failure: { code: string, message: string } | null } };

export type MyItCodeSubmissionsQueryVariables = Exact<{
  taskId?: string | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type MyItCodeSubmissionsQuery = { myITCodeSubmissions: { limit: number, offset: number, items: Array<{ runMode: ItCodeRunMode, id: string, userId: string, taskId: string, taskVersionId: string, taskVersionNumber: number, executionId: string, correlationId: string, language: ItProgrammingLanguage, sourceFileName: string, status: ItCodeSubmissionStatus, verdict: ItExecutionVerdict | null, createdAt: string, updatedAt: string, completedAt: string | null, compilation: { exitCode: number | null, stdout: string, stderr: string, durationMs: number, memoryBytes: number } | null, execution: { exitCode: number | null, stdout: string, stderr: string, durationMs: number, memoryBytes: number } | null, tests: Array<{ testId: string, verdict: ItExecutionVerdict, stdout: string, stderr: string, durationMs: number, memoryBytes: number }>, failure: { code: string, message: string } | null }> } };

export type CreateItTaskMutationVariables = Exact<{
  input: ItTaskInput;
}>;


export type CreateItTaskMutation = { createITTask: { id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, statement: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string, tags: Array<string>, constraints: Array<string>, options: Array<{ id: string, text: string, position: number, isCorrect: boolean | null }>, examples: Array<{ input: string, output: string, explanation: string }>, source: { sourceId: string, sourceName: string, sourceUrl: string, publishedAt: string | null } | null } };

export type UpdateItTaskMutationVariables = Exact<{
  id: string;
  input: ItTaskInput;
}>;


export type UpdateItTaskMutation = { updateITTask: { id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, statement: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string, tags: Array<string>, constraints: Array<string>, options: Array<{ id: string, text: string, position: number, isCorrect: boolean | null }>, examples: Array<{ input: string, output: string, explanation: string }>, source: { sourceId: string, sourceName: string, sourceUrl: string, publishedAt: string | null } | null } };

export type ChangeItTaskStatusMutationVariables = Exact<{
  id: string;
  status: ItTaskStatus;
}>;


export type ChangeItTaskStatusMutation = { changeITTaskStatus: { id: string, status: ItTaskStatus, taskVersionId: string, versionNumber: number, topicId: string | null, title: string, statement: string, taskType: ItTaskType, difficulty: ItTaskDifficulty, createdAt: string, updatedAt: string, tags: Array<string>, constraints: Array<string>, options: Array<{ id: string, text: string, position: number, isCorrect: boolean | null }>, examples: Array<{ input: string, output: string, explanation: string }>, source: { sourceId: string, sourceName: string, sourceUrl: string, publishedAt: string | null } | null } };

export type DeleteItTaskMutationVariables = Exact<{
  id: string;
}>;


export type DeleteItTaskMutation = { deleteITTask: boolean };

export type SubmitItTaskAnswerMutationVariables = Exact<{
  taskId: string;
  input: ItSubmissionInput;
}>;


export type SubmitItTaskAnswerMutation = { submitITTaskAnswer: { id: string, userId: string, taskId: string, taskVersionId: string, taskTitle: string, taskVersionNumber: number, selectedOptionIds: Array<string>, correctOptionIds: Array<string>, correct: boolean, verdict: ItSubmissionVerdict, taskUpdated: boolean, latestTaskVersionId: string, latestVersionNumber: number, createdAt: string } };

export type SubmitItTaskCodeMutationVariables = Exact<{
  taskId: string;
  input: ItCodeSubmissionInput;
}>;


export type SubmitItTaskCodeMutation = { submitITTaskCode: { runMode: ItCodeRunMode, id: string, userId: string, taskId: string, taskVersionId: string, taskVersionNumber: number, executionId: string, correlationId: string, language: ItProgrammingLanguage, sourceFileName: string, status: ItCodeSubmissionStatus, verdict: ItExecutionVerdict | null, createdAt: string, updatedAt: string, completedAt: string | null, compilation: { exitCode: number | null, stdout: string, stderr: string, durationMs: number, memoryBytes: number } | null, execution: { exitCode: number | null, stdout: string, stderr: string, durationMs: number, memoryBytes: number } | null, tests: Array<{ testId: string, verdict: ItExecutionVerdict, stdout: string, stderr: string, durationMs: number, memoryBytes: number }>, failure: { code: string, message: string } | null } };

export type ExternalTaskSearchQueryVariables = Exact<{
  query: string;
}>;


export type ExternalTaskSearchQuery = { externalTaskSearch: Array<{ title: string, url: string, rating: number, tags: Array<string> }> };

export type ImportExternalTaskMutationVariables = Exact<{
  input: StartTaskCollectionInput;
}>;


export type ImportExternalTaskMutation = { startTaskCollection: { id: string, status: TaskCollectionJobStatus } };

export type GoalLearningPlanQueryVariables = Exact<{
  goal: string;
  minutes: number;
  sessionCount: number;
}>;


export type GoalLearningPlanQuery = { learningPlan: { aiStatus: string, warnings: Array<string>, topics: Array<{ id: string, title: string }>, materials: Array<{ id: string, title: string, url: string, action: string, minutes: number }>, practice: { warnings: Array<string>, totalPlannedMinutes: number, topicInsights: Array<{ topicId: string, title: string, isTarget: boolean, nextAction: string, plannedTasks: number }>, sessions: Array<{ number: number, totalMinutes: number, items: Array<{ taskId: string, title: string, estimatedMinutes: number }> }> } | null } };
