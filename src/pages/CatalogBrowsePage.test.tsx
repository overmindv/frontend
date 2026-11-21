import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PROGRAMS_QUERY, UNIVERSITY_QUERY, UNIVERSITIES_QUERY } from "../api/catalog";
import { CatalogBrowsePage, CatalogDetailPage } from "./CatalogBrowsePage";

test("карточка университета целиком открывает публичную страницу", async () => {
  render(<MockedProvider mocks={[{ request: { query: UNIVERSITIES_QUERY, variables: { search: "" } }, result: { data: { universities: [{ __typename: "University", id: "university-id", name: "МГУ", shortName: "МГУ", city: "Москва", country: "Россия", websiteUrl: "https://msu.ru", logoFileId: null, status: "active", createdAt: "2026-08-17T10:00:00Z", updatedAt: "2026-08-17T10:00:00Z" }] } } }]}><MemoryRouter><CatalogBrowsePage kind="universities" /></MemoryRouter></MockedProvider>);

  expect(await screen.findByRole("link", { name: /МГУ/ })).toHaveAttribute("href", "/universities/university-id");
});


test("список программ фильтруется выбранным университетом", async () => {
  render(<MockedProvider mocks={[{ request: { query: PROGRAMS_QUERY, variables: { parentId: "u-1", search: "" } }, result: { data: { programs: [{ __typename: "Program", id: "p-1", universityId: null, name: "Анализ данных", shortName: "АД", faculty: "ФКН", degreeLevel: "bachelor", startYear: 2024, status: "active", createdAt: "", updatedAt: "" }] } } }]}><MemoryRouter initialEntries={["/programs?parentId=u-1"]}><CatalogBrowsePage kind="programs" /></MemoryRouter></MockedProvider>);
  expect(await screen.findByRole("link", { name: /Анализ данных/ })).toHaveAttribute("href", "/programs/p-1");
  expect(screen.getByRole("link", { name: /Все программы/ })).toHaveAttribute("href", "/programs");
});


test("страница университета открывает только его программы", async () => {
  render(<MockedProvider mocks={[{ request: { query: UNIVERSITY_QUERY, variables: { id: "u-1" } }, result: { data: { university: { __typename: "University", id: "u-1", name: "МГУ", shortName: "МГУ", city: "Москва", country: "Россия", websiteUrl: "", logoFileId: null, status: "active", createdAt: "", updatedAt: "" } } } }]}><MemoryRouter initialEntries={["/universities/u-1"]}><Routes><Route path="/universities/:id" element={<CatalogDetailPage kind="universities" />} /></Routes></MemoryRouter></MockedProvider>);
  expect(await screen.findByRole("link", { name: /Программы →/ })).toHaveAttribute("href", "/programs?parentId=u-1");
});
