import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PracticeProgress } from "../../api/progress";
import { ProgressOverview } from "./ProgressOverview";

const progress: PracticeProgress = {
  userId: "learner", public: false, attempts: 120, acceptedAttempts: 84,
  solvedTasks: 63, score: 1190, accuracyPercent: 70,
  daily: [{ date: "2026-11-08", attempts: 2, accepted: 1 }, { date: "2026-11-09", attempts: 0, accepted: 0 }],
  byDifficulty: [{ difficulty: "easy", solved: 20 }, { difficulty: "medium", solved: 30 }, { difficulty: "hard", solved: 13 }],
};

test("сводка показывает полную серверную статистику, график и данные таблицей", async () => {
  render(<ProgressOverview progress={progress} />);
  expect(screen.getByText("1 190")).toBeInTheDocument();
  expect(screen.getByText("63")).toBeInTheDocument();
  expect(screen.getByText("70%")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /Активность за 30 дней/i })).toBeInTheDocument();
  await userEvent.click(screen.getByText("Показать данные по дням"));
  expect(screen.getByRole("table", { name: /Данные активности по дням/i })).toBeInTheDocument();
  expect(screen.getByText("Сложные")).toBeInTheDocument();
});
