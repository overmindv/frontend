import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CREATE_TOPIC, TOPICS_QUERY, type Topic } from "../../api/catalog";
import { AuthProvider } from "../../context/AuthContext";
import { meMock } from "../../test/authMocks";
import { TopicsPage } from "./CatalogPages";

test.each([
  ["/admin/catalog/topics", null],
  ["/admin/catalog/courses/algorithms/topics", "algorithms"],
])("быстро создает тему и обновляет список: %s", async (path, courseId) => {
  const user = userEvent.setup();
  const topic = {
    __typename: "Topic",
    id: "binary-search",
    courseId,
    parentTopicId: null,
    title: "Бинарный поиск",
    slug: "binary-search",
    description: "",
    orderIndex: 0,
    difficulty: "basic",
    status: "draft",
    createdAt: "",
    updatedAt: "",
  } satisfies Topic & { __typename: "Topic" };
  const listRequest = { query: TOPICS_QUERY, variables: { parentId: courseId } };

  render(
    <MockedProvider mocks={[
      meMock({ id: "admin", isAdmin: true, isSuperuser: false }),
      { request: listRequest, result: { data: { topics: [], topicTree: [] } } },
      {
        request: { query: CREATE_TOPIC, variables: { input: { title: topic.title, courseId } } },
        result: { data: { createTopic: topic } },
      },
      { request: listRequest, result: { data: { topics: [topic], topicTree: [] } } },
    ]}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/admin/catalog/topics" element={<TopicsPage />} />
            <Route path="/admin/catalog/courses/:id/topics" element={<TopicsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  const title = await screen.findByRole("textbox", { name: "Быстро: название темы" });
  await user.type(title, " Бинарный поиск ");
  await user.click(screen.getByRole("button", { name: "Создать" }));

  expect(await screen.findByRole("link", { name: /Бинарный поиск/ })).toHaveAttribute(
    "href", "/admin/catalog/topics/binary-search",
  );
});
