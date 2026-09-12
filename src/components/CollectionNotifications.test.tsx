import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ACKNOWLEDGE_COLLECTION_JOB, COLLECTION_JOBS_QUERY } from "../api/collection";
import { ME_QUERY } from "../api/queries";
import { AuthProvider } from "../context/AuthContext";
import { CollectionNotifications } from "./CollectionNotifications";

// readIds фиксирует, какие job сервер пометил прочитанным (acknowledge).
let readIds = new Set<string>();

const job = {
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
  createdAt: "2026-09-12T00:00:00Z",
  finishedAt: null,
};

const meMock: MockedResponse = {
  request: { query: ME_QUERY },
  result: { data: { me: { __typename: "User", id: "admin-id", isAdmin: true, isSuperuser: false } } },
};

const jobsMocks: MockedResponse[] = [
  {
    request: { query: COLLECTION_JOBS_QUERY, variables: { unreadOnly: true, pagination: { limit: 10, offset: 0 } } },
    newData: () => ({
      data: {
        taskCollectionJobs: {
          __typename: "TaskCollectionJobList",
          items: [job].map((j) => ({ ...j, notificationAcknowledged: readIds.has(j.id) ? true : j.notificationAcknowledged })),
          limit: 10,
          offset: 0,
        },
      },
    }),
  },
];

const ackMock: MockedResponse = {
  request: { query: ACKNOWLEDGE_COLLECTION_JOB, variables: { id: "j1" } },
  result: () => { readIds.add("j1"); return { data: { acknowledgeTaskCollectionJob: true } }; },
};

function renderToast() {
  return render(
    <MockedProvider mocks={[meMock, ...jobsMocks, ackMock]}>
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<CollectionNotifications />} />
            <Route path="/admin/collected-tasks" element={<div data-testid="collected-page">Детали сбора</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );
}

const toast = () => document.querySelector(".collection-toast") as HTMLElement;
const isHiding = () => toast().classList.contains("collection-toast--hiding");

describe("CollectionNotifications", () => {
  beforeEach(() => {
    readIds = new Set<string>();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("авто-скрытие через 5 секунд не помечает уведомление прочитанным", async () => {
    renderToast();
    await screen.findByText("Сбор завершён");
    expect(isHiding()).toBe(false);

    // Через 5 секунд начинается fade, ещё 300мс — тост скрывается локально.
    act(() => { vi.advanceTimersByTime(5000); });
    expect(isHiding()).toBe(true);
    act(() => { vi.advanceTimersByTime(300); });
    await vi.waitFor(() => expect(document.querySelector(".collection-toast")).toBeNull());

    // Скрытие не вызвало acknowledge → уведомление осталось непрочитанным.
    expect(readIds.size).toBe(0);
  });

  test("наведение во время исчезания возвращает уведомление, а повторное исчезание — через 5 секунд", async () => {
    renderToast();
    await screen.findByText("Сбор завершён");

    act(() => { vi.advanceTimersByTime(5000); });
    expect(isHiding()).toBe(true);

    fireEvent.mouseEnter(screen.getByRole("link"));
    expect(isHiding()).toBe(false);

    fireEvent.mouseLeave(screen.getByRole("link"));
    expect(isHiding()).toBe(false);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(isHiding()).toBe(true);
  });

  test("клик по уведомлению ведёт на детали сбора и помечает его прочитанным", async () => {
    renderToast();
    await screen.findByText("Сбор завершён");

    fireEvent.click(screen.getByRole("link"));
    await screen.findByTestId("collected-page");
    expect(screen.getByTestId("collected-page")).toHaveTextContent("Детали сбора");
    expect(readIds.has("j1")).toBe(true);
  });

  test("крестик сразу скрывает уведомление без перехода и без прочтения", async () => {
    renderToast();
    await screen.findByText("Сбор завершён");

    fireEvent.click(screen.getByLabelText("Закрыть уведомление"));
    await vi.waitFor(() => expect(document.querySelector(".collection-toast")).toBeNull());
    expect(screen.queryByTestId("collected-page")).not.toBeInTheDocument();
    expect(readIds.size).toBe(0);
  });
});
