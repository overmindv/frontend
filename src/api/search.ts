import { gql } from "@apollo/client";
import { COURSE_FIELDS, PROGRAM_FIELDS, TOPIC_FIELDS, UNIVERSITY_FIELDS, type Course, type Program, type Topic, type University } from "./catalog";
import { TASK_SUMMARY_FIELDS, type ITTaskSummary } from "./tasks";

// Единый поиск по каталогу и опубликованным задачам: результаты собраны по видам.
export const SEARCH_QUERY = gql`
  query Search($query: String!, $limit: Int!) {
    search(query: $query, limit: $limit) {
      universities { ...UniversityFields }
      programs { ...ProgramFields }
      courses { ...CourseFields }
      topics { ...TopicFields }
      tasks { ...ITTaskSummaryFields }
    }
  }
  ${UNIVERSITY_FIELDS}
  ${PROGRAM_FIELDS}
  ${COURSE_FIELDS}
  ${TOPIC_FIELDS}
  ${TASK_SUMMARY_FIELDS}
`;

export interface SearchResults {
  universities: University[];
  programs: Program[];
  courses: Course[];
  topics: Topic[];
  tasks: ITTaskSummary[];
}

export type SearchKindKey = (typeof SEARCH_KINDS)[number]["key"];

// Пометки вида для подсказок и страницы результатов.
export const SEARCH_KINDS = [
  { key: "universities", label: "Вузы", singular: "вуз" },
  { key: "programs", label: "Программы", singular: "программа" },
  { key: "courses", label: "Курсы", singular: "курс" },
  { key: "topics", label: "Темы", singular: "тема" },
  { key: "tasks", label: "Задачи", singular: "задача" },
] as const;

export function totalResults(results: SearchResults): number {
  return results.universities.length + results.programs.length + results.courses.length + results.topics.length + results.tasks.length;
}

export type Searchable = University | Program | Course | Topic | ITTaskSummary;

// Целевой маршрут детальной страницы для вида.
export function kindHref(kind: SearchKindKey): string {
  return kind === "tasks" ? "/tasks" : `/${kind}`;
}

// Заголовок элемента (у каталога — name, у тем/задач — title).
export function kindTitle(item: Searchable): string {
  return "name" in item ? item.name : item.title;
}

// Вспомогательная подпись элемента для подсказок.
export function kindDescription(item: Searchable): string {
  if ("city" in item) return [item.city, item.country].filter(Boolean).join(" · ");
  if ("faculty" in item) return item.faculty || "Программа";
  if ("slug" in item && "difficulty" in item) return item.description || "Тема";
  if ("slug" in item) return item.description || "Курс";
  return "Задача";
}
