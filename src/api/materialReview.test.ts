import { buildSchema, validate } from "graphql";
import { expect, it } from "vitest";
import schemaSource from "../../schema/schema.graphqls?raw";
import * as reviewOperations from "./materialReview";

const schema = buildSchema(schemaSource);

it.each(Object.entries(reviewOperations))("%s matches the pinned GraphQL schema", (_name, operation) => {
  expect(validate(schema, operation)).toEqual([]);
});
