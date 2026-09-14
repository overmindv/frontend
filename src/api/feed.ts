import { gql } from "@apollo/client";

export type FeedKind =
  | "university_created"
  | "university_activated"
  | "program_created"
  | "program_activated"
  | "course_created"
  | "course_activated"
  | "topic_created"
  | "topic_activated"
  | "task_published";

export interface FeedItem {
  id: string;
  kind: FeedKind;
  title: string;
  text: string;
  href: string;
  actorUserId: string;
  occurredAt: string;
}

export interface FeedConnection {
  items: FeedItem[];
  limit: number;
  offset: number;
}

export const FEED_QUERY = gql`
  query Feed($pagination: PaginationInput) {
    feed(pagination: $pagination) {
      items { id kind title text href actorUserId occurredAt }
      limit
      offset
    }
  }
`;
