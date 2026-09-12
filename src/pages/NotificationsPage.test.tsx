import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test } from "vitest";
import { ACKNOWLEDGE_COLLECTION_JOB, COLLECTION_JOBS_QUERY } from "../api/collection";
import { ME_QUERY } from "../api/queries";
import { AuthProvider } from "../context/AuthContext";
import { NotificationsPage } from "./NotificationsPage";

// ackedIds хранит id jobs, которые сервер «прочитал»; новый refetch возвращает их как прочитанные.
const ackedIds = new Set<string>();

const baseJobs = [
  {
    __typename: "TaskCollectionJob",
    id: "j1",
    trigger: "manual",
    requestedBy: null,
    status: "succeeded",
    collectedTotal: 5,
    importedTotal: 3,
    duplicatesTotal: 1,
    invalidTotal: 1,
    errorCount: 0,
    errorMessage: "",
    notificationAcknowledged: false,
    createdAt: "2026-09-12T10:00:00Z",
    finishedAt: null,
  },
  {
    __typename: "TaskCollectionJob",
    id: "j2",
    trigger: "manual",
    requestedBy: null,
    status: "failed",
    collectedTotal: 0,
    importedTotal: 0,
    duplicatesTotal: 0,
    invalidTotal: 0,
    errorCount: 2,
    errorMessage: "network error",
    notificationAcknowledged: false,
    createdAt: "2026-09-11T09:00:00Z",
    finishedAt: null,
  },
];

const meMock: MockedResponse = {
  request: { query: ME_QUERY },
  result: { data: { me: { __typename: "User", id: "admin-id", isAdmin: true, isSuperuser: false } } },
};

const jobsMocks: MockedResponse[] = [
  {
    request: { query: COLLECTION_JOBS_QUERY, variables: { unreadOnly: false, pagination: { limit: 200, offset: 0 } } },
    newData: () => ({
      data: {
        taskCollectionJobs: {
          __typename: "TaskCollectionJobList",
          items: baseJobs.map((job) => ({ ...job, notificationAcknowledged: ackedIds.has(job.id) ? true : job.notificationAcknowledged })),
          limit: 200,
          offset: 0,
        },
      },
    }),
  },
];

const ackMock: MockedResponse = {
  request: { query: ACKNOWLEDGE_COLLECTION_JOB, variables: { id: "j1" } },
  result: () => { ackedIds.add("j1"); return { data: { acknowledgeTaskCollectionJob: true } }; },
};

function renderPage() {
  return render(
    <MockedProvider mocks={[meMock, ...jobsMocks, ackMock]}>
      <MemoryRouter initialEntries={["/notifications"]}>
        <AuthProvider>
          <Routes>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );
}

const rows = () => Array.from(document.querySelectorAll(".catalog-row")) as HTMLElement[];

describe("NotificationsPage", () => {
  beforeEach(() => ackedIds.clear());

  test("показывает все уведомления с метками прочтения", async () => {
    renderPage();
    await screen.findAllByRole("link", { name: /Открыть детали/ });

    expect(rows()).toHaveLength(2);
    expect(screen.getAllByText("Не прочитано")).toHaveLength(2);
    expect(within(rows()[0]).getByText("Сбор завершён")).toBeInTheDocument();
    expect(within(rows()[1]).getByText("Сбор не выполнен")).toBeInTheDocument();
  });

  test("фильтр по статусу отсекает остальные уведомления", async () => {
    renderPage();
    await screen.findAllByRole("link", { name: /Открыть детали/ });

    fireEvent.change(screen.getByLabelText("Статус"), { target: { value: "failed" } });

    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText("Сбор не выполнен")).toBeInTheDocument();
    expect(within(rows()[0]).queryByText("Сбор завершён")).not.toBeInTheDocument();
  });

  test("отметка прочитанным и фильтр «Непрочитанные»", async () => {
    renderPage();
    const links = await screen.findAllByRole("link", { name: /Открыть детали/ });

    // Отмечаем j1 (первая строка) прочитанным.
    const row = links[0].closest("article")!;
    fireEvent.click(within(row).getByText("Отметить прочитанным"));
    await within(row).findByText("Прочитано");

    // После фильтра «Непрочитанные» остаётся только j2.
    fireEvent.change(screen.getByLabelText("Прочитано"), { target: { value: "unread" } });
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).queryByText("Сбор завершён")).not.toBeInTheDocument();
    expect(within(rows()[0]).getByText("Сбор не выполнен")).toBeInTheDocument();
  });
});
