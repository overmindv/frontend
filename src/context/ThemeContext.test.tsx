import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme, ThemeProvider } from "./ThemeContext";

function ThemeProbe() {
  const { preference, resolvedTheme, cycleTheme } = useTheme();

  return <button onClick={cycleTheme}>{preference}:{resolvedTheme}</button>;
}

test("тема по умолчанию светлая и переключается при каждом нажатии", async () => {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }) });
  const user = userEvent.setup();
  render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

  expect(screen.getByRole("button")).toHaveTextContent("light:light");
  expect(document.documentElement.dataset.theme).toBe("light");
  // каждое нажатие — противоположная тема
  await user.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveTextContent("dark:dark");
  expect(localStorage.getItem("overmindv-theme")).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  await user.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveTextContent("light:light");
  expect(localStorage.getItem("overmindv-theme")).toBe("light");
  expect(document.documentElement.dataset.theme).toBe("light");
});
