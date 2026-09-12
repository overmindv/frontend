import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ACKNOWLEDGE_COLLECTION_JOB, COLLECTION_JOBS_QUERY } from "../api/collection";
import { ME_QUERY } from "../api/queries";
import { AuthProvider } from "../context/AuthContext";
import { CollectionNotifications } from "./CollectionNotifications";

// acked имитирует, что сервер пометил job прочитанным: следующий refetch вернёт пустой список.
let acked = false;

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
    // newData переиспользуется для каждого poll/refetch, чтобы возвращать актуальный список.
    newData: () => ({
      data: {
        taskCollectionJobs: {
          __typename: "TaskCollectionJobList",
          items: acked ? [] : [job],
          limit: 10,
          offset: 0,
        },
      },
    }),
  },
];

const ackMock: MockedResponse = {
  request: { query: ACKNOWLEDGE_COLLECTION_JOB, variables: { id: "j1" } },
  result: { data: { acknowledgeTaskCollectionJob: true } },
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
    acked = false;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("показывает уведомление и через 5 секунд плавно исчезает, затем закрывается", async () => {
    renderToast();
    await screen.findByText("Сбор завершён");
    expect(isHiding()).toBe(false);

    // Через 5 секунд без наведения начинается fade.
    act(() => { vi.advanceTimersByTime(5000); });
    expect(isHiding()).toBe(true);

    // Ещё 300мс — fade закончен, срабатывает acknowledge и тост убирается из списка.
    acked = true;
    act(() => { vi.advanceTimersByTime(300); });
    await vi.waitFor(() => expect(document.querySelector(".collection-toast")).toBeNull());
  });

  test("наведение во время исчезания возвращает уведомление, а повторное исчезание — через 5 секунд", async () => {
    renderToast();
    await screen.findByText("Сбор завершён");

    act(() => { vi.advanceTimersByTime(5000); });
    expect(isHiding()).toBe(true);

    // Наводим курсор — возвращаем на 100% и отменяем закрытие.
    fireEvent.mouseEnter(screen.getByRole("link"));
    expect(isHiding()).toBe(false);

    // Уводим курсор — таймер сбрасывается, через 5 секунд снова fade.
    fireEvent.mouseLeave(screen.getByRole("link"));
    expect(isHiding()).toBe(false);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(isHiding()).toBe(true);
  });

  test("клик по уведомлению ведёт на страницу решения о публикации (детали сбора)", async () => {
    renderToast();
    await screen.findByText("Сбор завершён");

    fireEvent.click(screen.getByRole("link"));
    await screen.findByTestId("collected-page");
    expect(screen.getByTestId("collected-page")).toHaveTextContent("Детали сбора");
  });

  test("крестик сразу закрывает уведомление без перехода", async () => {
    renderToast();
    await screen.findByText("Сбор завершён");

    acked = true;
    fireEvent.click(screen.getByLabelText("Закрыть уведомление"));
    await vi.waitFor(() => expect(document.querySelector(".collection-toast")).toBeNull());
    expect(screen.queryByTestId("collected-page")).not.toBeInTheDocument();
  });
});
