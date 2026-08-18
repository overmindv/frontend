import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { AvatarOnboardingPage } from "./AvatarOnboardingPage";

const uploadAvatarMock = vi.hoisted(() => vi.fn());

vi.mock("../api/media", () => ({
  uploadAvatar: uploadAvatarMock,
}));

test("завершает загрузку аватара при регистрации в StrictMode", async () => {
  uploadAvatarMock.mockImplementation((_blob: Blob, signal?: AbortSignal) => new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => resolve({}), 10);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Загрузка отменена", "AbortError"));
    }, { once: true });
  }));
  const avatar = new Blob(["avatar"], { type: "image/webp" });
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[{ pathname: "/onboarding/avatar", state: { avatar } }]}>
        <Routes>
          <Route path="/onboarding/avatar" element={<AvatarOnboardingPage />} />
          <Route path="/profile" element={<div>Профиль с аватаром</div>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );

  expect(await screen.findByText("Профиль с аватаром")).toBeInTheDocument();
  expect(uploadAvatarMock).toHaveBeenCalledOnce();
});
