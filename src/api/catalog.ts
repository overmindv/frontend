import { gql } from "@apollo/client";

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

export const UNIVERSITIES_QUERY = gql`query Universities { universities { ...UniversityFields } } ${UNIVERSITY_FIELDS}`;
export const UNIVERSITY_QUERY = gql`query University($id: ID!) { university(id: $id) { ...UniversityFields } } ${UNIVERSITY_FIELDS}`;
export const PROGRAMS_QUERY = gql`query Programs($parentId: ID) { programs(universityId: $parentId) { ...ProgramFields } } ${PROGRAM_FIELDS}`;
export const COURSES_QUERY = gql`query Courses($parentId: ID) { courses(programId: $parentId) { ...CourseFields } } ${COURSE_FIELDS}`;
export const TOPICS_QUERY = gql`query Topics($parentId: ID) { topics(courseId: $parentId) { ...TopicFields } topicTree(courseId: $parentId) { topic { ...TopicFields } children { topic { ...TopicFields } children { topic { ...TopicFields } } } } } ${TOPIC_FIELDS}`;
export const TOPIC_QUERY = gql`query Topic($id: ID!) { topic(id: $id) { ...TopicFields } topicPrerequisites(topicId: $id) { topicId prerequisiteTopicId createdAt } } ${TOPIC_FIELDS}`;

export const CREATE_UNIVERSITY = gql`mutation CreateUniversity($input: CreateUniversityInput!) { createUniversity(input: $input) { ...UniversityFields } } ${UNIVERSITY_FIELDS}`;
export const UPDATE_UNIVERSITY = gql`mutation UpdateUniversity($id: ID!, $input: UpdateUniversityInput!) { updateUniversity(id: $id, input: $input) { ...UniversityFields } } ${UNIVERSITY_FIELDS}`;
export const CREATE_PROGRAM = gql`mutation CreateProgram($input: CreateProgramInput!) { createProgram(input: $input) { ...ProgramFields } } ${PROGRAM_FIELDS}`;
export const CREATE_COURSE = gql`mutation CreateCourse($input: CreateCourseInput!) { createCourse(input: $input) { ...CourseFields } } ${COURSE_FIELDS}`;
export const CREATE_TOPIC = gql`mutation CreateTopic($input: CreateTopicInput!) { createTopic(input: $input) { ...TopicFields } } ${TOPIC_FIELDS}`;
export const UPDATE_TOPIC = gql`mutation UpdateTopic($id: ID!, $input: UpdateTopicInput!) { updateTopic(id: $id, input: $input) { ...TopicFields } } ${TOPIC_FIELDS}`;
export const DELETE_ENTITY = {
  university: gql`mutation DeleteUniversity($id: ID!) { deleteUniversity(id: $id) }`,
  program: gql`mutation DeleteProgram($id: ID!) { deleteProgram(id: $id) }`,
  course: gql`mutation DeleteCourse($id: ID!) { deleteCourse(id: $id) }`,
  topic: gql`mutation DeleteTopic($id: ID!) { deleteTopic(id: $id) }`,
};
export const CHANGE_STATUS = {
  university: gql`mutation ChangeUniversityStatus($id: ID!, $status: CatalogStatus!) { changeUniversityStatus(id: $id, status: $status) { id status } }`,
  program: gql`mutation ChangeProgramStatus($id: ID!, $status: CatalogStatus!) { changeProgramStatus(id: $id, status: $status) { id status } }`,
  course: gql`mutation ChangeCourseStatus($id: ID!, $status: CatalogStatus!) { changeCourseStatus(id: $id, status: $status) { id status } }`,
  topic: gql`mutation ChangeTopicStatus($id: ID!, $status: CatalogStatus!) { changeTopicStatus(id: $id, status: $status) { id status } }`,
};
export const ADD_PREREQUISITE = gql`mutation AddPrerequisite($input: TopicPrerequisiteInput!) { addTopicPrerequisite(input: $input) { topicId prerequisiteTopicId createdAt } }`;
export const REMOVE_PREREQUISITE = gql`mutation RemovePrerequisite($input: TopicPrerequisiteInput!) { removeTopicPrerequisite(input: $input) }`;

export type CatalogStatus = "draft" | "active" | "hidden" | "archived";
export interface University { id: string; name: string; shortName: string; city: string; country: string; websiteUrl: string; logoFileId?: string; status: CatalogStatus }
export interface Program { id: string; universityId?: string | null; name: string; shortName: string; faculty: string; degreeLevel: string; startYear?: number; status: CatalogStatus }
export interface Course { id: string; programId?: string | null; name: string; slug: string; description: string; semester?: number; yearNumber?: number; status: CatalogStatus }
export interface Topic { id: string; courseId?: string | null; parentTopicId?: string | null; title: string; slug: string; description: string; orderIndex: number; difficulty: string; status: CatalogStatus }
