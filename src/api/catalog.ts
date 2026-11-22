import { gql, type TypedDocumentNode } from "@apollo/client";
import type * as Schema from "./generated";

export const UNIVERSITY_FIELDS = gql`
  fragment UniversityFields on University { id name shortName city country websiteUrl logoFileId status createdAt updatedAt }
`;
export const PROGRAM_FIELDS = gql`
  fragment ProgramFields on Program { id universityId name shortName faculty degreeLevel startYear status createdAt updatedAt }
`;
export const COURSE_FIELDS = gql`
  fragment CourseFields on Course { id programId name slug description semester yearNumber status createdAt updatedAt }
`;
export const TOPIC_FIELDS = gql`
  fragment TopicFields on Topic { id courseId parentTopicId title slug description orderIndex difficulty status createdAt updatedAt }
`;

export const UNIVERSITIES_QUERY: TypedDocumentNode<Schema.UniversitiesQuery, Schema.UniversitiesQueryVariables> = gql`query Universities($search: String = "") { universities(filter: { search: $search }) { ...UniversityFields } } ${UNIVERSITY_FIELDS}`;
export const UNIVERSITY_QUERY: TypedDocumentNode<Schema.UniversityQuery, Schema.UniversityQueryVariables> = gql`query University($id: ID!) { university(id: $id) { ...UniversityFields } } ${UNIVERSITY_FIELDS}`;
export const PROGRAMS_QUERY: TypedDocumentNode<Schema.ProgramsQuery, Schema.ProgramsQueryVariables> = gql`query Programs($parentId: ID, $search: String = "") { programs(universityId: $parentId, filter: { search: $search }) { ...ProgramFields } } ${PROGRAM_FIELDS}`;
export const PROGRAM_QUERY: TypedDocumentNode<Schema.ProgramQuery, Schema.ProgramQueryVariables> = gql`query Program($id: ID!) { program(id: $id) { ...ProgramFields } } ${PROGRAM_FIELDS}`;
export const COURSES_QUERY: TypedDocumentNode<Schema.CoursesQuery, Schema.CoursesQueryVariables> = gql`query Courses($parentId: ID, $search: String = "") { courses(programId: $parentId, filter: { search: $search }) { ...CourseFields } } ${COURSE_FIELDS}`;
export const COURSE_QUERY: TypedDocumentNode<Schema.CourseQuery, Schema.CourseQueryVariables> = gql`query Course($id: ID!) { course(id: $id) { ...CourseFields } } ${COURSE_FIELDS}`;
export const TOPICS_QUERY: TypedDocumentNode<Schema.TopicsQuery, Schema.TopicsQueryVariables> = gql`query Topics($parentId: ID, $search: String = "") { topics(courseId: $parentId, filter: { search: $search }) { ...TopicFields } topicTree(courseId: $parentId) { topic { ...TopicFields } children { topic { ...TopicFields } children { topic { ...TopicFields } } } } } ${TOPIC_FIELDS}`;
export const TOPIC_QUERY: TypedDocumentNode<Schema.TopicQuery, Schema.TopicQueryVariables> = gql`query Topic($id: ID!) { topic(id: $id) { ...TopicFields } topicPrerequisites(topicId: $id) { topicId prerequisiteTopicId createdAt } } ${TOPIC_FIELDS}`;

export const CREATE_UNIVERSITY: TypedDocumentNode<Schema.CreateUniversityMutation, Schema.CreateUniversityMutationVariables> = gql`mutation CreateUniversity($input: CreateUniversityInput!) { createUniversity(input: $input) { ...UniversityFields } } ${UNIVERSITY_FIELDS}`;
export const UPDATE_UNIVERSITY: TypedDocumentNode<Schema.UpdateUniversityMutation, Schema.UpdateUniversityMutationVariables> = gql`mutation UpdateUniversity($id: ID!, $input: UpdateUniversityInput!) { updateUniversity(id: $id, input: $input) { ...UniversityFields } } ${UNIVERSITY_FIELDS}`;
export const CREATE_PROGRAM: TypedDocumentNode<Schema.CreateProgramMutation, Schema.CreateProgramMutationVariables> = gql`mutation CreateProgram($input: CreateProgramInput!) { createProgram(input: $input) { ...ProgramFields } } ${PROGRAM_FIELDS}`;
export const UPDATE_PROGRAM: TypedDocumentNode<Schema.UpdateProgramMutation, Schema.UpdateProgramMutationVariables> = gql`mutation UpdateProgram($id: ID!, $input: UpdateProgramInput!) { updateProgram(id: $id, input: $input) { ...ProgramFields } } ${PROGRAM_FIELDS}`;
export const CREATE_COURSE: TypedDocumentNode<Schema.CreateCourseMutation, Schema.CreateCourseMutationVariables> = gql`mutation CreateCourse($input: CreateCourseInput!) { createCourse(input: $input) { ...CourseFields } } ${COURSE_FIELDS}`;
export const UPDATE_COURSE: TypedDocumentNode<Schema.UpdateCourseMutation, Schema.UpdateCourseMutationVariables> = gql`mutation UpdateCourse($id: ID!, $input: UpdateCourseInput!) { updateCourse(id: $id, input: $input) { ...CourseFields } } ${COURSE_FIELDS}`;
export const CREATE_TOPIC: TypedDocumentNode<Schema.CreateTopicMutation, Schema.CreateTopicMutationVariables> = gql`mutation CreateTopic($input: CreateTopicInput!) { createTopic(input: $input) { ...TopicFields } } ${TOPIC_FIELDS}`;
export const UPDATE_TOPIC: TypedDocumentNode<Schema.UpdateTopicMutation, Schema.UpdateTopicMutationVariables> = gql`mutation UpdateTopic($id: ID!, $input: UpdateTopicInput!) { updateTopic(id: $id, input: $input) { ...TopicFields } } ${TOPIC_FIELDS}`;
export const DELETE_ENTITY: {
  university: TypedDocumentNode<Schema.DeleteUniversityMutation, Schema.DeleteUniversityMutationVariables>;
  program: TypedDocumentNode<Schema.DeleteProgramMutation, Schema.DeleteProgramMutationVariables>;
  course: TypedDocumentNode<Schema.DeleteCourseMutation, Schema.DeleteCourseMutationVariables>;
  topic: TypedDocumentNode<Schema.DeleteTopicMutation, Schema.DeleteTopicMutationVariables>;
} = {
  university: gql`mutation DeleteUniversity($id: ID!) { deleteUniversity(id: $id) }`,
  program: gql`mutation DeleteProgram($id: ID!) { deleteProgram(id: $id) }`,
  course: gql`mutation DeleteCourse($id: ID!) { deleteCourse(id: $id) }`,
  topic: gql`mutation DeleteTopic($id: ID!) { deleteTopic(id: $id) }`,
};
export const CHANGE_STATUS: {
  university: TypedDocumentNode<Schema.ChangeUniversityStatusMutation, Schema.ChangeUniversityStatusMutationVariables>;
  program: TypedDocumentNode<Schema.ChangeProgramStatusMutation, Schema.ChangeProgramStatusMutationVariables>;
  course: TypedDocumentNode<Schema.ChangeCourseStatusMutation, Schema.ChangeCourseStatusMutationVariables>;
  topic: TypedDocumentNode<Schema.ChangeTopicStatusMutation, Schema.ChangeTopicStatusMutationVariables>;
} = {
  university: gql`mutation ChangeUniversityStatus($id: ID!, $status: CatalogStatus!) { changeUniversityStatus(id: $id, status: $status) { id status } }`,
  program: gql`mutation ChangeProgramStatus($id: ID!, $status: CatalogStatus!) { changeProgramStatus(id: $id, status: $status) { id status } }`,
  course: gql`mutation ChangeCourseStatus($id: ID!, $status: CatalogStatus!) { changeCourseStatus(id: $id, status: $status) { id status } }`,
  topic: gql`mutation ChangeTopicStatus($id: ID!, $status: CatalogStatus!) { changeTopicStatus(id: $id, status: $status) { id status } }`,
};
export const ADD_PREREQUISITE: TypedDocumentNode<Schema.AddPrerequisiteMutation, Schema.AddPrerequisiteMutationVariables> = gql`mutation AddPrerequisite($input: TopicPrerequisiteInput!) { addTopicPrerequisite(input: $input) { topicId prerequisiteTopicId createdAt } }`;
export const REMOVE_PREREQUISITE: TypedDocumentNode<Schema.RemovePrerequisiteMutation, Schema.RemovePrerequisiteMutationVariables> = gql`mutation RemovePrerequisite($input: TopicPrerequisiteInput!) { removeTopicPrerequisite(input: $input) }`;

export type CatalogStatus = Schema.CatalogStatus;
export type University = Schema.UniversityFieldsFragment;
export type Program = Schema.ProgramFieldsFragment;
export type Course = Schema.CourseFieldsFragment;
export type Topic = Schema.TopicFieldsFragment;
