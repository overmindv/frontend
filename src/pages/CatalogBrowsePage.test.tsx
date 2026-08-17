import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UNIVERSITIES_QUERY } from "../api/catalog";
import { CatalogBrowsePage } from "./CatalogBrowsePage";

test("карточка университета целиком открывает публичную страницу", async () => {
  render(<MockedProvider mocks={[{ request: { query: UNIVERSITIES_QUERY, variables: { parentId: null } }, result: { data: { universities: [{ __typename: "University", id: "university-id", name: "МГУ", shortName: "МГУ", city: "Москва", country: "Россия", websiteUrl: "https://msu.ru", logoFileId: null, status: "active", createdAt: "2026-08-17T10:00:00Z", updatedAt: "2026-08-17T10:00:00Z" }] } } }]}><MemoryRouter><CatalogBrowsePage kind="universities" /></MemoryRouter></MockedProvider>);

  expect(await screen.findByRole("link", { name: /МГУ/ })).toHaveAttribute("href", "/universities/university-id");
});
