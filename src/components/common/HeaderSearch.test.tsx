import { MockedProvider } from "@apollo/client/testing";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SEARCH_QUERY } from "../../api/search";
import { Header } from "./Header";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false, logout: vi.fn() }),
}));
vi.mock("../../context/ThemeContext", () => ({
  useTheme: () => ({ preference: "light", resolvedTheme: "light", cycleTheme: vi.fn() }),
}));

const results = {
  universities: [{ __typename: "University", id: "uni-1", name: "НИУ ВШЭ", shortName: "ВШЭ", city: "Москва", country: "Россия", websiteUrl: "", logoFileId: null, status: "active", createdAt: "", updatedAt: "" }],
  programs: [], courses: [], topics: [], tasks: [], materials: [],
};

test("скрывает подсказки предыдущего запроса сразу после изменения строки", async () => {
  render(
    <MockedProvider mocks={[
      {
        request: { query: SEARCH_QUERY, variables: { query: "вшэ", limit: 5 } },
        result: { data: { search: results } },
      },
      {
        request: { query: SEARCH_QUERY, variables: { query: "мгу", limit: 5 } },
        delay: 1000,
        result: { data: { search: { ...results, universities: [] } } },
      },
    ]}>
      <MemoryRouter><Header /></MemoryRouter>
    </MockedProvider>,
  );
  const input = screen.getByRole("textbox", { name: "Глобальный поиск" });
  expect(input).toHaveAttribute("placeholder", "Поиск по каталогу, задачам и материалам");
  fireEvent.change(input, { target: { value: "вшэ" } });
  expect(await screen.findByText("НИУ ВШЭ", {}, { timeout: 1500 })).toBeInTheDocument();

  fireEvent.change(input, { target: { value: "мгу" } });

  expect(screen.queryByText("НИУ ВШЭ")).not.toBeInTheDocument();
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  expect(screen.queryByText("НИУ ВШЭ")).not.toBeInTheDocument();
});

test("отличает ошибку поиска от успешного пустого результата", async () => {
  render(
    <MockedProvider mocks={[{
      request: { query: SEARCH_QUERY, variables: { query: "вшэ", limit: 5 } },
      error: new Error("upstream unavailable"),
    }]}>
      <MemoryRouter><Header /></MemoryRouter>
    </MockedProvider>,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Глобальный поиск" }), { target: { value: "вшэ" } });

  expect(await screen.findByText("Не удалось выполнить поиск. Попробуйте ещё раз.", {}, { timeout: 1500 })).toBeInTheDocument();
  expect(screen.queryByText(/Нет совпадений/)).not.toBeInTheDocument();
});
