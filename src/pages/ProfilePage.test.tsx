import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TOKEN_STORAGE_KEY, USER_ID_STORAGE_KEY } from "../api/client";
import { GET_USER_QUERY } from "../api/queries";
import { MY_IT_CODE_SUBMISSIONS_QUERY, MY_IT_SUBMISSIONS_QUERY } from "../api/tasks";
import { AuthProvider } from "../context/AuthContext";
import { ProfilePage } from "./ProfilePage";

const user = {
  __typename: "User",
  id: "user-id",
  email: "mail@example.com",
  username: "ivanov",
  firstName: "Иван",
  lastName: "Иванов",
  birthDate: "2000-01-01",
  phone: "+70000000000",
  roles: [],
  isAdmin: false,
  isSuperuser: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// TestProfileCodeLink проверяет, что программная попытка ведёт на страницу результата.
test("кодовая попытка в профиле ведёт на страницу результата решения", async () => {
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(USER_ID_STORAGE_KEY, "user-id");

  render(
    <MockedProvider
      mocks={[
        {
          request: { query: GET_USER_QUERY, variables: { id: "user-id" } },
          result: { data: { getUser: user } },
        },
        {
          request: { query: MY_IT_SUBMISSIONS_QUERY, variables: { taskId: null, pagination: { limit: 20, offset: 0 } } },
          result: { data: { myITSubmissions: { items: [], limit: 20, offset: 0 } } },
        },
        {
          request: {
            query: MY_IT_CODE_SUBMISSIONS_QUERY,
            variables: { taskId: null, pagination: { limit: 20, offset: 0 } },
          },
          result: {
            data: {
              myITCodeSubmissions: {
                items: [
                  {
                    __typename: "ITCodeSubmission",
                    id: "code-submission-id",
                    userId: "user-id",
                    taskId: "programming-id",
                    taskVersionId: "version-id",
                    taskVersionNumber: 1,
                    executionId: "execution-id",
                    correlationId: "correlation-id",
                    language: "python",
                    sourceFileName: "solution.py",
                    sourceCode: "print(4)\n",
                    status: "completed",
                    verdict: "accepted",
                    compilation: null,
                    execution: null,
                    tests: [],
                    failure: null,
                    createdAt: "2026-08-13T10:00:00Z",
                    updatedAt: "2026-08-13T10:00:01Z",
                    completedAt: "2026-08-13T10:00:01Z",
                  },
                ],
                limit: 20,
                offset: 0,
              },
            },
          },
        },
      ]}
    >
      <MemoryRouter>
        <AuthProvider>
          <ProfilePage />
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  const link = await screen.findByRole("link", { name: /Задача progra/ });
  expect(link).toHaveAttribute("href", "/code-submission/code-submission-id");
  expect(screen.getAllByText("Принято").length).toBeGreaterThan(0);
});
