import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SEARCH_QUERY } from "../api/search";
import { SearchPage } from "./SearchPage";

const results = {
  universities: [{ __typename: "University", id: "uni-1", name: "НИУ ВШЭ", shortName: "ВШЭ", city: "Москва", country: "Россия", websiteUrl: "", status: "active", createdAt: "", updatedAt: "" }],
  programs: [],
  courses: [],
  topics: [{ __typename: "Topic", id: "topic-1", courseId: null, parentTopicId: null, title: "Динамика", slug: "", description: "Движение тел", orderIndex: 0, difficulty: "intro", status: "active", createdAt: "", updatedAt: "" }],
  tasks: [],
};

function renderPage(query: string) {
  render(
    <MockedProvider mocks={[{ request: { query: SEARCH_QUERY, variables: { query, limit: 20 } }, result: { data: { search: results } } }]}>
      <MemoryRouter initialEntries={[`/search?q=${encodeURIComponent(query)}`]}>
        <SearchPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe("SearchPage", () => {
  it("показывает записи, сгруппированные и подписанные по виду", async () => {
    renderPage("вшэ");
    expect(await screen.findByText("Вузы")).toBeInTheDocument();
    expect(screen.getByText("НИУ ВШЭ")).toBeInTheDocument();
    expect(screen.getByText("Темы")).toBeInTheDocument();
    expect(screen.getByText("Динамика")).toBeInTheDocument();
  });

  it("без запроса предлагает ввести его", () => {
    renderPage("");
    expect(screen.getByText("Поиск по всей платформе")).toBeInTheDocument();
  });
});
