import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ADMIN_USERS_QUERY, SET_USER_ADMIN } from "../../api/adminUsers";
import { TOKEN_STORAGE_KEY, USER_ID_STORAGE_KEY } from "../../api/client";
import { AuthProvider } from "../../context/AuthContext";
import { AdminUsersPage } from "./UsersPage";

const student = {
  __typename: "User",
  id: "student-id",
  email: "student@example.com",
  username: "student",
  firstName: "Student",
  lastName: "",
  birthDate: null,
  phone: null,
  roles: [],
  isAdmin: false,
  isSuperuser: false,
  createdAt: "2026-07-18T10:00:00Z",
  updatedAt: "2026-07-18T10:00:00Z",
};

function adminToken() {
  const header = base64URL({ alg: "HS256", typ: "JWT" });
  const payload = base64URL({ sub: "admin-id", roles: ["admin"] });

  return `${header}.${payload}.signature`;
}

function base64URL(value: unknown) {
  return window
    .btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

test("администратор назначает обычного пользователя администратором", async () => {
  localStorage.setItem(TOKEN_STORAGE_KEY, adminToken());
  localStorage.setItem(USER_ID_STORAGE_KEY, "admin-id");
  const user = userEvent.setup();
  vi.spyOn(window, "confirm").mockReturnValue(true);

  render(
    <MockedProvider
      addTypename={false}
      mocks={[
        {
          request: { query: ADMIN_USERS_QUERY, variables: { search: "student" } },
          result: { data: { users: [student] } },
        },
        {
          request: {
            query: SET_USER_ADMIN,
            variables: { id: "student-id", admin: true },
          },
          result: {
            data: {
              setUserAdmin: {
                ...student,
                roles: ["admin"],
                isAdmin: true,
                updatedAt: "2026-07-18T10:05:00Z",
              },
            },
          },
        },
        {
          request: { query: ADMIN_USERS_QUERY, variables: { search: "student" } },
          result: {
            data: {
              users: [
                {
                  ...student,
                  roles: ["admin"],
                  isAdmin: true,
                  updatedAt: "2026-07-18T10:05:00Z",
                },
              ],
            },
          },
        },
      ]}
    >
      <MemoryRouter>
        <AuthProvider>
          <AdminUsersPage />
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  await user.type(screen.getByRole("textbox", { name: "Username или email" }), "student");
  await user.click(screen.getByRole("button", { name: "Найти пользователя" }));
  expect(await screen.findByText("@student")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Действия с пользователем" }));
  await user.click(screen.getByRole("button", { name: "Назначить администратором" }));

  expect(await screen.findByText("Администратор")).toBeInTheDocument();
});
