import { useQuery } from "@apollo/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import {
  MY_IT_CODE_SUBMISSIONS_QUERY,
  MY_IT_SUBMISSIONS_QUERY,
  type ITCodeSubmission,
  type ITSubmission,
} from "../../api/tasks";

// TaskSolveStatusKind описывает, как текущий пользователь условие по задаче.
export type TaskSolveStatusKind = "solved" | "attempted" | "pending" | "unavailable" | "none";

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
export function useTaskSolveStatus(taskId: string, enabled: boolean, userId?: string | null): {
  loading: boolean;
  stats: TaskSolveStats | null;
  recordAnswer: (submission: ITSubmission) => void;
  recordCode: (submission: ITCodeSubmission) => void;
} {
  const [confirmedCode, setConfirmedCode] = useState<ITCodeSubmission[]>([]);
  const recordCode = useCallback((submission: ITCodeSubmission) => {
    setConfirmedCode((current) => [...current.filter((item) => item.id !== submission.id), submission]);
  }, []);
  const [confirmedAnswers, setConfirmedAnswers] = useState<ITSubmission[]>([]);
  const answers = useQuery(MY_IT_SUBMISSIONS_QUERY, {
    variables: { taskId, pagination: { limit: 100, offset: 0 } },
    skip: !enabled,
    fetchPolicy: "network-only",
  });
  const code = useQuery(MY_IT_CODE_SUBMISSIONS_QUERY, {
    variables: { taskId, pagination: { limit: 100, offset: 0 } },
    skip: !enabled,
    fetchPolicy: "network-only",
  });

  const historyPage = useRef("");
  useEffect(() => { historyPage.current = ""; }, [taskId]);
  const codeItemsLoaded = code.data?.myITCodeSubmissions.items;
  const fetchMoreCode = code.fetchMore;
  useEffect(() => {
    const offset = codeItemsLoaded?.length ?? 0;
    if (!enabled || offset === 0 || offset % 100 !== 0) return;
    const page = `${taskId}:${offset}`;
    if (historyPage.current === page) return;
    historyPage.current = page;
    // Samples не должны вытеснять более раннее оцениваемое решение из прогресса.
    void fetchMoreCode({
      variables: { taskId, pagination: { limit: 100, offset } },
      updateQuery: (previous, { fetchMoreResult }) => ({
        myITCodeSubmissions: {
          ...previous.myITCodeSubmissions,
          items: [...previous.myITCodeSubmissions.items, ...(fetchMoreResult?.myITCodeSubmissions.items ?? [])],
        },
      }),
    }).catch(() => undefined);
  }, [enabled, taskId, codeItemsLoaded, fetchMoreCode]);

  const recordAnswer = (submission: ITSubmission) => {
    // Mutation success is already persisted. A failed/stale history refresh must
    // not erase it, and an idempotent retry must not count the same attempt twice.
    setConfirmedAnswers((current) => [...current.filter((item) => item.id !== submission.id), submission]);
    void answers.refetch().catch(() => undefined);
  };

  if (!enabled) {
    return { loading: false, stats: null, recordAnswer, recordCode };
  }

  const historyItems = (answers.data ?? answers.previousData)?.myITSubmissions.items ?? [];
  const choiceItems = [...new Map([...historyItems, ...confirmedAnswers]
    .filter((item) => item.taskId === taskId)
    .map((item) => [item.id, item])).values()];
  const codeItems = [...new Map([...(code.data?.myITCodeSubmissions.items ?? []), ...confirmedCode]
    .filter((item) => item.taskId === taskId && item.runMode === "graded" && (!userId || item.userId === userId))
    .map((item) => [item.id, item])).values()];

  if ((answers.loading || code.loading) && choiceItems.length === 0 && codeItems.length === 0) {
    return { loading: true, stats: null, recordAnswer, recordCode };
  }

  const attempted = choiceItems.length + codeItems.length;
  const accepted =
    choiceItems.filter((item) => item.verdict === "accepted").length +
    codeItems.filter((item) => item.verdict === "accepted").length;

  const completedCode = codeItems.filter((item) => item.status === "completed" && item.verdict !== "infrastructure_error" && item.verdict !== "checker_error");
  const evaluated = choiceItems.length + completedCode.length;
  const codeTotalTests = completedCode.reduce((sum, item) => sum + item.tests.length, 0);
  const codePassedTests = completedCode.reduce(
    (sum, item) => sum + item.tests.filter((test) => test.verdict === "accepted").length,
    0,
  );

  const status: TaskSolveStatusKind = accepted > 0 ? "solved"
    : codeItems.some((item) => item.status === "queued") ? "pending"
    : evaluated > 0 ? "attempted" : codeItems.length > 0 ? "unavailable" : "none";

  return {
    loading: false,
    recordAnswer,
    recordCode,
    stats: {
      status,
      attempted,
      accepted,
      accuracy: evaluated ? Math.round((accepted / evaluated) * 100) : 0,
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
    pending: { Icon: CircleDashed, label: "Решение ожидает проверки", cls: "is-none" },
    unavailable: { Icon: CircleDashed, label: "Проверка временно недоступна", cls: "is-none" },
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
