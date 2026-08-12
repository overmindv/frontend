import { useMutation, useQuery } from "@apollo/client";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { Topic } from "../../api/catalog";
import { getErrorMessage } from "../../api/errors";
import {
  IT_TASK_QUERY,
  IT_TASK_TOPICS_QUERY,
  IT_TASKS_QUERY,
  IT_SUBMISSION_QUERY,
  MY_IT_SUBMISSIONS_QUERY,
  SUBMIT_IT_TASK_ANSWER,
  type ITSubmission,
  type ITSubmissionInput,
  type ITTask,
  type ITTaskDifficulty,
  type ITTaskFilter,
  type ITTaskList,
  type ITTaskType,
} from "../../api/tasks";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Spinner } from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";
import { ProgrammingTaskSolve } from "./ProgrammingTaskSolve";

const pageSize = 12;

// TasksPage показывает опубликованные IT-задачи и явные фильтры.
export function TasksPage() {
  const [offset, setOffset] = useState(0);
  const [taskType, setTaskType] = useState<ITTaskType | "">("");
  const [difficulty, setDifficulty] = useState<ITTaskDifficulty | "">("");
  const [topicId, setTopicId] = useState("");
  const topics = useQuery<{ topics: Topic[] }>(IT_TASK_TOPICS_QUERY);
  const filter: ITTaskFilter = {
    ...(taskType ? { taskType } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(topicId ? { topicId } : {}),
  };
  const { data, loading, error } = useQuery<{ itTasks: ITTaskList }>(IT_TASKS_QUERY, {
    variables: {
      filter,
      pagination: { limit: pageSize, offset },
    },
    fetchPolicy: "cache-and-network",
  });
  const items = data?.itTasks.items ?? [];

  return (
    <main className="page-shell tasks-page">
      <section className="tasks-hero">
        <div>
          <span className="eyebrow">IT practice</span>
          <h1>Проверяйте знания<br />короткими подходами.</h1>
        </div>
        <p>
          Тесты по программированию без лишнего шума. Выберите тему, решите задачу и сразу
          получите разбор результата.
        </p>
      </section>

      <section className="task-toolbar" aria-label="Фильтры задач">
        <FilterSelect
          label="Формат"
          value={taskType}
          onChange={(value) => {
            setTaskType(value as ITTaskType | "");
            setOffset(0);
          }}
          options={[
            ["", "Все форматы"],
            ["single_choice", "Один ответ"],
            ["multiple_choice", "Несколько ответов"],
            ["programming", "Программирование"],
          ]}
        />
        <FilterSelect
          label="Сложность"
          value={difficulty}
          onChange={(value) => {
            setDifficulty(value as ITTaskDifficulty | "");
            setOffset(0);
          }}
          options={[
            ["", "Любая"],
            ["easy", "Начальная"],
            ["medium", "Средняя"],
            ["hard", "Сложная"],
          ]}
        />
        <FilterSelect
          label="Тема"
          value={topicId}
          onChange={(value) => {
            setTopicId(value);
            setOffset(0);
          }}
          options={[
            ["", "Все темы"],
            ...(topics.data?.topics.map((topic) => [topic.id, topic.title] as [string, string]) ?? []),
          ]}
        />
        <div className="task-toolbar__count">
          <span>На странице</span>
          <strong>{items.length.toString().padStart(2, "0")}</strong>
        </div>
      </section>

      {(error || topics.error) && <ErrorMessage message={getErrorMessage(error ?? topics.error)} />}
      {loading && !data ? (
        <div className="panel panel--center"><Spinner label="Загружаем задачи…" /></div>
      ) : items.length === 0 ? (
        <EmptyState title="Задач пока нет" text="Попробуйте изменить фильтры или вернитесь позже." />
      ) : (
        <section className="task-grid" aria-label="Список задач">
          {items.map((task, index) => (
            <TaskCard key={task.id} task={task} index={offset + index + 1} topics={topics.data?.topics ?? []} />
          ))}
        </section>
      )}

      <Pagination
        offset={offset}
        hasNext={items.length === pageSize}
        onChange={setOffset}
      />
    </main>
  );
}

// TaskSolvePage показывает версию теста и отправляет выбранные варианты.
export function TaskSolvePage() {
  const { id = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ITSubmission | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const { data, loading, error, refetch } = useQuery<{ itTask: ITTask }>(IT_TASK_QUERY, {
    variables: { id },
  });
  const [submit, submitState] = useMutation<
    { submitITTaskAnswer: ITSubmission },
    { taskId: string; input: ITSubmissionInput }
  >(SUBMIT_IT_TASK_ANSWER);
  const task = data?.itTask;

  // toggleOption обновляет множество выбранных ответов и начинает новую попытку.
  const toggleOption = (optionID: string) => {
    if (!task) return;
    setResult(null);
    idempotencyKey.current = null;
    if (task.taskType === "single_choice") {
      setSelected([optionID]);
      return;
    }
    setSelected((current) =>
      current.includes(optionID)
        ? current.filter((idValue) => idValue !== optionID)
        : [...current, optionID],
    );
  };

  // handleSubmit отправляет ответ по версии, которую пользователь увидел.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task || selected.length === 0) return;
    const key = idempotencyKey.current ?? crypto.randomUUID();
    idempotencyKey.current = key;
    const response = await submit({
      variables: {
        taskId: task.id,
        input: {
          taskVersionId: task.taskVersionId,
          idempotencyKey: key,
          selectedOptionIds: selected,
        },
      },
    });
    if (response.data?.submitITTaskAnswer) {
      setResult(response.data.submitITTaskAnswer);
    }
  };

  // loadLatestTask загружает актуальную версию и очищает локальную попытку.
  const loadLatestTask = async () => {
    await refetch();
    setSelected([]);
    setResult(null);
    idempotencyKey.current = null;
  };

  if (loading && !task) {
    return <main className="page-shell panel panel--center"><Spinner label="Открываем тест…" /></main>;
  }
  if (error || !task) {
    return <main className="page-shell panel"><ErrorMessage message={getErrorMessage(error)} /></main>;
  }

  if (task.taskType === "programming") {
    return <ProgrammingTaskSolve task={task} isAuthenticated={isAuthenticated} />;
  }

  return (
    <main className="page-shell solve-layout">
      <aside className="solve-aside">
        <Link className="back-link" to="/tasks">← Все задачи</Link>
        <div className="solve-index">IT / {task.versionNumber.toString().padStart(2, "0")}</div>
        <TaskMeta task={task} />
        <p className="solve-hint">
          {task.taskType === "single_choice"
            ? "В этой задаче один правильный вариант."
            : "Выберите все подходящие варианты."}
        </p>
      </aside>

      <section className="solve-card">
        <header>
          <span className="eyebrow">Задача</span>
          <h1>{task.title}</h1>
          <p>{task.statement}</p>
        </header>

        {result?.taskUpdated && (
          <div className="version-notice" role="status">
            <div>
              <strong>Тест был обновлён</strong>
              <span>Ответ проверен по версии, которую вы открыли.</span>
            </div>
            <button className="text-button" type="button" onClick={() => void loadLatestTask()}>
              Открыть новую версию
            </button>
          </div>
        )}

        <form className="answer-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="answer-list">
            {task.options.map((option, index) => {
              const isSelected = selected.includes(option.id);
              const isCorrect = result?.correctOptionIds.includes(option.id) ?? false;
              const isWrong = Boolean(result && isSelected && !isCorrect);

              return (
                <label
                  className={`answer-option${isSelected ? " is-selected" : ""}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}`}
                  key={option.id}
                >
                  <input
                    checked={isSelected}
                    name="answer"
                    onChange={() => toggleOption(option.id)}
                    type={task.taskType === "single_choice" ? "radio" : "checkbox"}
                    value={option.id}
                  />
                  <span className="answer-option__index">{String.fromCharCode(65 + index)}</span>
                  <span>{option.text}</span>
                </label>
              );
            })}
          </div>

          {submitState.error && <ErrorMessage message={getErrorMessage(submitState.error)} />}
          {result && <SubmissionResult result={result} />}

          <div className="solve-actions">
            {isAuthenticated ? (
              <button className="button button--primary" disabled={selected.length === 0 || submitState.loading}>
                {submitState.loading ? <Spinner label="Проверяем…" /> : result ? "Проверить ещё раз" : "Проверить ответ"}
              </button>
            ) : (
              <Link className="button button--primary" to="/login">Войти и отправить ответ</Link>
            )}
            <span>Версия {task.versionNumber}</span>
          </div>
        </form>
      </section>
    </main>
  );
}

// SubmissionHistoryPage показывает независимые попытки текущего пользователя.
export function SubmissionHistoryPage() {
  const [offset, setOffset] = useState(0);
  const { data, loading, error } = useQuery<{
    myITSubmissions: { items: ITSubmission[]; limit: number; offset: number };
  }>(MY_IT_SUBMISSIONS_QUERY, {
    variables: { taskId: null, pagination: { limit: pageSize, offset } },
    fetchPolicy: "cache-and-network",
  });
  const items = data?.myITSubmissions.items ?? [];

  return (
    <main className="page-shell history-page">
      <header className="section-heading">
        <div>
          <span className="eyebrow">Журнал решений</span>
          <h1>История попыток</h1>
        </div>
        <p>Каждая отправка хранится отдельно — включая старые версии задач.</p>
      </header>
      {error && <ErrorMessage message={getErrorMessage(error)} />}
      {loading && !data ? (
        <div className="panel panel--center"><Spinner label="Загружаем историю…" /></div>
      ) : items.length === 0 ? (
        <EmptyState title="История пуста" text="Решите первую задачу — результат появится здесь." />
      ) : (
        <div className="history-list">
          {items.map((submission) => (
            <article className="history-row" key={submission.id}>
              <div className={`verdict-mark ${submission.correct ? "is-accepted" : "is-wrong"}`}>
                {submission.correct ? "OK" : "WA"}
              </div>
              <div className="history-row__main">
                <strong>{submission.correct ? "Ответ принят" : "Неверный ответ"}</strong>
                <span>{formatDate(submission.createdAt)} · версия {submission.taskVersionNumber}</span>
              </div>
              {submission.taskUpdated && <span className="status-tag">есть новая версия</span>}
              <Link className="text-link" to={`/history/${submission.id}`}>Результат →</Link>
            </article>
          ))}
        </div>
      )}
      <Pagination offset={offset} hasNext={items.length === pageSize} onChange={setOffset} />
    </main>
  );
}

// SubmissionDetailPage повторно получает сохранённый результат владельца.
export function SubmissionDetailPage() {
  const { id = "" } = useParams();
  const { data, loading, error } = useQuery<{ itSubmission: ITSubmission }>(IT_SUBMISSION_QUERY, {
    variables: { id },
  });
  const submission = data?.itSubmission;

  if (loading && !submission) {
    return <main className="page-shell panel panel--center"><Spinner label="Загружаем результат…" /></main>;
  }
  if (error || !submission) {
    return <main className="page-shell panel"><ErrorMessage message={getErrorMessage(error)} /></main>;
  }

  return (
    <main className="page-shell result-page">
      <Link className="back-link" to="/history">← История попыток</Link>
      <section className={`result-card ${submission.correct ? "is-accepted" : "is-wrong"}`}>
        <header>
          <span className="eyebrow">Сохранённый результат</span>
          <h1>{submission.correct ? "Ответ принят" : "Неверный ответ"}</h1>
          <p>{formatDate(submission.createdAt)}</p>
        </header>
        <dl className="result-metrics">
          <div><dt>Версия задачи</dt><dd>{submission.taskVersionNumber}</dd></div>
          <div><dt>Выбрано</dt><dd>{submission.selectedOptionIds.length}</dd></div>
          <div><dt>Правильных</dt><dd>{submission.correctOptionIds.length}</dd></div>
          <div><dt>Вердикт</dt><dd>{submission.verdict === "accepted" ? "accepted" : "wrong answer"}</dd></div>
        </dl>
        {submission.taskUpdated && (
          <div className="version-notice">
            <div><strong>После решения тест обновился</strong><span>Эта попытка навсегда привязана к версии {submission.taskVersionNumber}.</span></div>
          </div>
        )}
        <footer>
          <Link className="button button--primary" to={`/tasks/${submission.taskId}`}>Открыть актуальную задачу</Link>
        </footer>
      </section>
    </main>
  );
}

// TaskCard отображает краткую карточку опубликованного теста.
function TaskCard({ task, index, topics }: { task: ITTaskList["items"][number]; index: number; topics: Topic[] }) {
  const topic = topics.find((item) => item.id === task.topicId);

  return (
    <article className="task-card">
      <div className="task-card__number">{index.toString().padStart(2, "0")}</div>
      <div className="task-card__body">
        <div className="task-card__meta">
          <span>{difficultyLabel(task.difficulty)}</span>
          <span>{typeLabel(task.taskType)}</span>
        </div>
        <h2>{task.title}</h2>
        <p>{topic?.title ?? "Общая практика"}</p>
      </div>
      <Link aria-label={`Открыть задачу ${task.title}`} className="task-card__link" to={`/tasks/${task.id}`}>
        <span>Решить</span><b>↗</b>
      </Link>
    </article>
  );
}

// TaskMeta отображает краткие параметры открытой версии.
function TaskMeta({ task }: { task: ITTask }) {
  return (
    <dl className="solve-meta">
      <div><dt>Формат</dt><dd>{typeLabel(task.taskType)}</dd></div>
      <div><dt>Уровень</dt><dd>{difficultyLabel(task.difficulty)}</dd></div>
      <div><dt>{task.taskType === "programming" ? "Примеров" : "Вариантов"}</dt><dd>{task.taskType === "programming" ? task.examples.length : task.options.length}</dd></div>
    </dl>
  );
}

// SubmissionResult показывает итог последней отправки.
function SubmissionResult({ result }: { result: ITSubmission }) {
  return (
    <div className={`submission-result ${result.correct ? "is-accepted" : "is-wrong"}`} role="status">
      <span>{result.correct ? "Решено" : "Пока не сходится"}</span>
      <strong>{result.correct ? "Ответ принят" : "Проверьте отмеченные варианты"}</strong>
      <small>{result.correct ? "Результат сохранён в истории." : "Можно изменить выбор и попробовать ещё раз."}</small>
    </div>
  );
}

// FilterSelect отображает компактный именованный фильтр.
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <label className="filter-select">
      <span>{label}</span>
      <select value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
        {options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}
      </select>
    </label>
  );
}

// Pagination переключает страницы без предположения об общем количестве.
function Pagination({ offset, hasNext, onChange }: { offset: number; hasNext: boolean; onChange: (offset: number) => void }) {
  if (offset === 0 && !hasNext) return null;

  return (
    <nav className="pagination" aria-label="Пагинация">
      <button className="button button--ghost" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - pageSize))}>← Назад</button>
      <span>Страница {Math.floor(offset / pageSize) + 1}</span>
      <button className="button button--ghost" disabled={!hasNext} onClick={() => onChange(offset + pageSize)}>Дальше →</button>
    </nav>
  );
}

// EmptyState объясняет пустое состояние списка.
function EmptyState({ title, text }: { title: string; text: string }) {
  return <section className="empty-state"><span>00</span><h2>{title}</h2><p>{text}</p></section>;
}

// typeLabel переводит технический тип задачи.
function typeLabel(taskType: ITTaskType) {
  if (taskType === "programming") return "Программирование";
  return taskType === "single_choice" ? "Один ответ" : "Несколько ответов";
}

// difficultyLabel переводит уровень сложности.
function difficultyLabel(difficulty: ITTaskDifficulty) {
  return { easy: "Начальная", medium: "Средняя", hard: "Сложная" }[difficulty];
}

// formatDate форматирует серверную дату для истории.
function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
