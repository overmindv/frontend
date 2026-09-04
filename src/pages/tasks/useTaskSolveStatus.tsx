import { useQuery } from "@apollo/client";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import {
  MY_IT_CODE_SUBMISSIONS_QUERY,
  MY_IT_SUBMISSIONS_QUERY,
  type ITCodeSubmission,
  type ITSubmission,
} from "../../api/tasks";

// TaskSolveStatusKind описывает, как текущий пользователь условие по задаче.
export type TaskSolveStatusKind = "solved" | "attempted" | "none";

// TaskSolveStats — сводные показатели, выводимые из попыток пользователя по задаче.
export interface TaskSolveStats {
  status: TaskSolveStatusKind;
  attempted: number; // всего попыток
  accepted: number; // попыток с вердиктом accepted
  accuracy: number; // процент принятых из всех попыток
  hasCode: boolean; // есть ли программные решения
  codeTestsPassed: number; // принятых тестов по кодовым решениям
  codeTestsTotal: number; // всего тестов по завершённым кодовым решениям
}

// useTaskSolveStatus собирает историю текущего пользователя по задаче и сводит её
// в краткий статус для бейджа и метрик. При неавторизованном доступе ничего не грузит.
export function useTaskSolveStatus(taskId: string, enabled: boolean): { loading: boolean; stats: TaskSolveStats | null } {
  const answers = useQuery<{ myITSubmissions: { items: ITSubmission[] } }>(MY_IT_SUBMISSIONS_QUERY, {
    variables: { taskId, pagination: { limit: 100, offset: 0 } },
    skip: !enabled,
    fetchPolicy: "network-only",
  });
  const code = useQuery<{ myITCodeSubmissions: { items: ITCodeSubmission[] } }>(MY_IT_CODE_SUBMISSIONS_QUERY, {
    variables: { taskId, pagination: { limit: 100, offset: 0 } },
    skip: !enabled,
    fetchPolicy: "network-only",
  });

  if (!enabled) {
    return { loading: false, stats: null };
  }

  const choiceItems = answers.data?.myITSubmissions.items ?? [];
  const codeItems = code.data?.myITCodeSubmissions.items ?? [];

  if (answers.loading || code.loading) {
    return { loading: true, stats: null };
  }

  const attempted = choiceItems.length + codeItems.length;
  const accepted =
    choiceItems.filter((item) => item.verdict === "accepted").length +
    codeItems.filter((item) => item.verdict === "accepted").length;

  const completedCode = codeItems.filter((item) => item.status === "completed");
  const codeTotalTests = completedCode.reduce((sum, item) => sum + item.tests.length, 0);
  const codePassedTests = completedCode.reduce(
    (sum, item) => sum + item.tests.filter((test) => test.verdict === "accepted").length,
    0,
  );

  const status: TaskSolveStatusKind = attempted === 0 ? "none" : accepted > 0 ? "solved" : "attempted";

  return {
    loading: false,
    stats: {
      status,
      attempted,
      accepted,
      accuracy: attempted ? Math.round((accepted / attempted) * 100) : 0,
      hasCode: codeItems.length > 0,
      codeTestsPassed: codePassedTests,
      codeTestsTotal: codeTotalTests,
    },
  };
}

// TaskSolveStatusBanner показывает, как пользователь решил задачу, и сводку попыток.
export function TaskSolveStatusBanner({ stats }: { stats: TaskSolveStats }) {
  const config = {
    solved: { Icon: CheckCircle2, label: "Решена правильно", cls: "is-solved" },
    attempted: { Icon: XCircle, label: "Есть решение, но неверное", cls: "is-wrong" },
    none: { Icon: CircleDashed, label: "Ещё не решалась", cls: "is-none" },
  }[stats.status];
  const Icon = config.Icon;

  return (
    <div className={`task-solve-status ${config.cls}`} role="status">
      <div className="task-solve-status__badge">
        <Icon size={18} />
        <strong>{config.label}</strong>
      </div>
      {stats.attempted > 0 && (
        <dl className="task-solve-status__metrics">
          <div><dt>Попытки</dt><dd>{stats.attempted}</dd></div>
          <div><dt>Принято</dt><dd>{stats.accepted}</dd></div>
          <div><dt>Точность</dt><dd>{stats.accuracy}%</dd></div>
          {stats.hasCode && <div><dt>Тесты прошло</dt><dd>{stats.codeTestsTotal > 0 ? `${stats.codeTestsPassed} из ${stats.codeTestsTotal}` : "—"}</dd></div>}
        </dl>
      )}
    </div>
  );
}
