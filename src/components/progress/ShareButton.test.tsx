import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareButton } from "./ShareButton";

test("копирует каноническую ссылку, если системный шаринг недоступен", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<ShareButton path="/tasks/task-1" title="Задача" label="Поделиться задачей" />);
  await userEvent.click(screen.getByRole("button", { name: "Поделиться задачей" }));
  expect(writeText).toHaveBeenCalledWith(new URL("/tasks/task-1", window.location.origin).href);
  expect(screen.getByRole("status")).toHaveTextContent("Ссылка скопирована");
});
