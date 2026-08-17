import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme, ThemeProvider } from "./ThemeContext";

function ThemeProbe() {
  const { preference, resolvedTheme, cycleTheme } = useTheme();

  return <button onClick={cycleTheme}>{preference}:{resolvedTheme}</button>;
}

test("тема учитывает систему и сохраняет ручной выбор", async () => {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }) });
  const user = userEvent.setup();
  render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

  expect(screen.getByRole("button")).toHaveTextContent("system:dark");
  await user.click(screen.getByRole("button"));
  expect(localStorage.getItem("overmindv-theme")).toBe("light");
  expect(document.documentElement.dataset.theme).toBe("light");
  await user.click(screen.getByRole("button"));
  expect(localStorage.getItem("overmindv-theme")).toBe("dark");
  await user.click(screen.getByRole("button"));
  expect(localStorage.getItem("overmindv-theme")).toBeNull();
});
