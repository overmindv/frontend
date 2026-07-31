import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { GET_USER_QUERY } from "../../api/queries";
import { UPDATE_USER_MUTATION } from "../../api/mutations";
import { TOKEN_STORAGE_KEY, USER_ID_STORAGE_KEY } from "../../api/client";
import { AuthProvider } from "../../context/AuthContext";
import { Profile } from "./Profile";

const originalUser = {
  __typename: "User",
  id: "user-id",
  email: "user@example.com",
  username: "user",
  firstName: "Старое",
  lastName: "Имя",
  birthDate: "2000-01-20",
  phone: "+79991234567",
  roles: [],
  isAdmin: false,
  isSuperuser: false,
  createdAt: "2026-06-28T00:00:00Z",
  updatedAt: "2026-06-28T00:00:00Z",
};

test("загружает и обновляет профиль", async () => {
  localStorage.setItem(TOKEN_STORAGE_KEY, "jwt");
  localStorage.setItem(USER_ID_STORAGE_KEY, "user-id");
  const user = userEvent.setup();
  render(
    <MockedProvider
      addTypename={false}
      mocks={[
        {
          request: { query: GET_USER_QUERY, variables: { id: "user-id" } },
          result: { data: { getUser: originalUser } },
        },
        {
          request: {
            query: UPDATE_USER_MUTATION,
            variables: { id: "user-id", input: { firstName: "Новое" } },
          },
          result: {
            data: {
              updateUser: {
                ...originalUser,
                firstName: "Новое",
                updatedAt: "2026-06-28T01:00:00Z",
              },
            },
          },
        },
      ]}
    >
      <MemoryRouter>
        <AuthProvider><Profile /></AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  const firstName = await screen.findByLabelText("Имя");
  expect(firstName).toHaveValue("Старое");
  await user.clear(firstName);
  await user.type(firstName, "Новое");
  await user.click(screen.getByRole("button", { name: "Сохранить изменения" }));

  expect(await screen.findByText("Профиль сохранён.")).toBeInTheDocument();
  expect(screen.getByLabelText("Имя")).toHaveValue("Новое");
});
