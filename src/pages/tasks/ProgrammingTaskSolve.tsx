import { useMutation, useQuery } from "@apollo/client";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../../api/errors";
import {
  IT_CODE_SUBMISSION_QUERY,
  SUBMIT_IT_TASK_CODE,
  type ITCodeSubmission,
  type ITCodeSubmissionInput,
  type ITExecutionPhaseResult,
  type ITExecutionVerdict,
  type ITProgrammingLanguage,
  type ITTask,
} from "../../api/tasks";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Spinner } from "../../components/common/Spinner";

const maxSourceFileSize = 256 * 1024;
const pollingInterval = 1500;

interface ProgrammingTaskSolveProps {
  task: ITTask;
  isAuthenticated: boolean;
}

// ProgrammingTaskSolve показывает условие и отправку файла в двух равных колонках.
export function ProgrammingTaskSolve({ task, isAuthenticated }: ProgrammingTaskSolveProps) {
  const [language, setLanguage] = useState<ITProgrammingLanguage>("python");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");
  const [submission, setSubmission] = useState<ITCodeSubmission | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const idempotencyKey = useRef<string | null>(null);
  const splitContainer = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(() => Number(localStorage.getItem("overmindv-solve-split")) || 50);
  const [draftCode, setDraftCode] = useState("");

  const [submitCode, submitState] = useMutation<
    { submitITTaskCode: ITCodeSubmission },
    { taskId: string; input: ITCodeSubmissionInput }
  >(SUBMIT_IT_TASK_CODE);

  const resultState = useQuery<
    { itCodeSubmission: ITCodeSubmission },
    { id: string }
  >(IT_CODE_SUBMISSION_QUERY, {
    variables: { id: submission?.id ?? "" },
    skip: !submission || submission.status !== "queued",
    fetchPolicy: "network-only",
    pollInterval: submission?.status === "queued" ? pollingInterval : 0,
  });

  useEffect(() => {
    if (resultState.data?.itCodeSubmission) {
      setSubmission(resultState.data.itCodeSubmission);
    }
  }, [resultState.data]);

  // resetAttempt очищает локальное состояние при смене языка или файла.
  const resetAttempt = () => {
    setSubmission(null);
    setValidationError("");
    submitState.reset();
    idempotencyKey.current = null;
  };

  // handleLanguageChange начинает попытку для выбранного формата исходника.
  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(event.target.value as ITProgrammingLanguage);
    setSourceFile(null);
    resetAttempt();

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };

  // handleFileChange проверяет размер и расширение до отправки на backend.
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    resetAttempt();
    setSourceFile(null);

    if (!file) {
      return;
    }

    const expectedExtension = language === "python" ? ".py" : ".go";
    if (!file.name.toLowerCase().endsWith(expectedExtension)) {
      setValidationError(`Для выбранного языка нужен файл ${expectedExtension}`);
      event.target.value = "";

      return;
    }

    if (file.size === 0) {
      setValidationError("Файл решения не должен быть пустым");
      event.target.value = "";

      return;
    }

    if (file.size > maxSourceFileSize) {
      setValidationError("Размер файла не должен превышать 256 КБ");
      event.target.value = "";

      return;
    }

    setSourceFile(file);
  };

  // handleSubmit отправляет файл по версии задачи, которую видит пользователь.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sourceFile || submission?.status === "queued") {
      return;
    }

    const key =
      submission?.status === "completed"
        ? crypto.randomUUID()
        : (idempotencyKey.current ?? crypto.randomUUID());

    idempotencyKey.current = key;

    const response = await submitCode({
      variables: {
        taskId: task.id,
        input: {
          taskVersionId: task.taskVersionId,
          idempotencyKey: key,
          language,
          file: sourceFile,
        },
      },
    });

    if (response.data?.submitITTaskCode) {
      setSubmission(response.data.submitITTaskCode);
    }
  };

  const requestError =
    submitState.error ?? (submission?.status === "queued" ? resultState.error : undefined);

  // updateSplit изменяет ширину условия и сохраняет её для следующих задач.
  const updateSplit = (next: number) => {
    const value = Math.min(70, Math.max(30, next));
    setSplit(value);
    localStorage.setItem("overmindv-solve-split", String(value));
  };

  // startResize отслеживает горизонтальное перемещение разделителя до отпускания указателя.
  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const move = (moveEvent: PointerEvent) => {
      const rect = splitContainer.current?.getBoundingClientRect();
      if (rect) updateSplit(((moveEvent.clientX - rect.left) / rect.width) * 100);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <main className="page-shell programming-solve-page">
      <div className="programming-solve-nav">
        <Link className="back-link" to="/tasks">
          ← Все задачи
        </Link>

        <span>Версия {task.versionNumber}</span>
      </div>

      <div className="programming-solve-layout" ref={splitContainer} style={{ gridTemplateColumns: `minmax(0, ${split}fr) 10px minmax(0, ${100 - split}fr)` }}>
        <article className="programming-statement">
          <header>
            <span className="eyebrow">Задача по программированию</span>
            <h1>{task.title}</h1>
            <p>{task.statement}</p>
          </header>

          {task.tags.length > 0 && (
            <div className="tag-list" aria-label="Теги задачи">
              {task.tags.map((tag) => (
                <span className="status-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <TaskExamples examples={task.examples} />
          <TaskConstraints constraints={task.constraints} />

          {task.source && (
            <a
              className="button button--ghost programming-source-link"
              href={task.source.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              Открыть оригинал ↗
            </a>
          )}
        </article>

        <button className="solve-resizer" aria-label="Изменить ширину панелей" aria-valuemin={30} aria-valuemax={70} aria-valuenow={Math.round(split)} onPointerDown={startResize} onKeyDown={(event) => { if (event.key === "ArrowLeft") updateSplit(split - 2); if (event.key === "ArrowRight") updateSplit(split + 2); }} role="separator" type="button"><span /></button>

        <aside className="programming-workspace" aria-label="Отправка решения">
          <header>
            <div>
              <span className="eyebrow">Решение</span>
              <h2>Решение</h2>
            </div>

            <span className="programming-workspace__mode">FILE MODE</span>
          </header>

          <div className="code-editor-stub"><div className="code-editor-stub__bar"><span>{language === "python" ? "solution.py" : "solution.go"}</span><small>Черновик не отправляется</small></div><div className="code-editor-stub__body"><span aria-hidden="true">1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9<br />10</span><textarea aria-label="Черновик решения" onChange={(event) => setDraftCode(event.target.value)} placeholder={language === "python" ? "# Напишите решение здесь\n# Отправка пока доступна только файлом" : "// Напишите решение здесь\n// Отправка пока доступна только файлом"} spellCheck={false} value={draftCode} /></div></div>

          <form className="code-upload-form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="field">
              <span>Язык программирования</span>
              <select value={language} onChange={handleLanguageChange}>
                <option value="python">Python</option>
                <option value="go">Go</option>
              </select>
            </label>

            <label className={`code-file-drop${sourceFile ? " has-file" : ""}`}>
              <input
                accept={language === "python" ? ".py" : ".go"}
                onChange={handleFileChange}
                ref={fileInput}
                type="file"
              />

              <span className="code-file-drop__icon">↥</span>
              <strong>{sourceFile ? sourceFile.name : "Выберите файл решения"}</strong>
              <small>
                {sourceFile
                  ? `${formatFileSize(sourceFile.size)} · готов к отправке`
                  : `${language === "python" ? ".py" : ".go"}, не больше 256 КБ`}
              </small>
            </label>

            {validationError && <ErrorMessage message={validationError} />}
            {requestError && <ErrorMessage message={getErrorMessage(requestError)} />}

            {isAuthenticated ? (
              <button
                className="button button--primary"
                disabled={!sourceFile || submitState.loading || submission?.status === "queued"}
                type="submit"
              >
                {submitState.loading ? (
                  <Spinner label="Отправляем…" />
                ) : submission?.status === "queued" ? (
                  "Ожидаем проверку…"
                ) : submission?.status === "completed" ? (
                  "Отправить ещё раз"
                ) : (
                  "Отправить на проверку"
                )}
              </button>
            ) : (
              <Link className="button button--primary" to="/login">
                Войти и отправить решение
              </Link>
            )}
          </form>

          <CodeSubmissionResult examples={task.examples} submission={submission} />
        </aside>
      </div>
    </main>
  );
}

// TaskExamples показывает открытые тесты без скрытых ожидаемых данных.
function TaskExamples({ examples }: { examples: ITTask["examples"] }) {
  if (examples.length === 0) {
    return null;
  }

  return (
    <section className="programming-section">
      <div className="programming-section__heading">
        <span>Открытые тесты</span>
        <b>{examples.length.toString().padStart(2, "0")}</b>
      </div>

      <div className="programming-example-list">
        {examples.map((example, index) => (
          <article className="programming-example" key={`${example.input}-${index}`}>
            <strong>Тест {index + 1}</strong>

            <div>
              <span>Ввод</span>
              <pre>{example.input}</pre>
            </div>

            <div>
              <span>Ожидаемый вывод</span>
              <pre>{example.output}</pre>
            </div>

            {example.explanation && <p>{example.explanation}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

// TaskConstraints показывает опубликованные ограничения задачи.
function TaskConstraints({ constraints }: { constraints: string[] }) {
  if (constraints.length === 0) {
    return null;
  }

  return (
    <section className="programming-section">
      <div className="programming-section__heading">
        <span>Ограничения</span>
        <b>{constraints.length.toString().padStart(2, "0")}</b>
      </div>

      <ul className="programming-constraints">
        {constraints.map((constraint) => (
          <li key={constraint}>{constraint}</li>
        ))}
      </ul>
    </section>
  );
}

// CodeSubmissionResult показывает очередь и leetcode-стиль результат sandbox:
// сводку «X из N тестов прошло» и сворачиваемые кейсы с входом, ожидаемым
// и фактическим выводом. tests[i] соответствует i-му открытому примеру задачи.
function CodeSubmissionResult({
  examples,
  submission,
}: {
  examples: ITTask["examples"];
  submission: ITCodeSubmission | null;
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());

  // Сброс раскрытых кейсов при переходе к другой попытке (сменился id submission).
  useEffect(() => {
    setExpanded(new Set());
  }, [submission?.id]);

  if (!submission) {
    return (
      <section className="code-result code-result--empty">
        <span>Результат проверки появится здесь</span>
        <small>После отправки статус проверки будет обновляться автоматически.</small>
      </section>
    );
  }

  if (submission.status === "queued") {
    return (
      <section className="code-result code-result--queued" aria-live="polite">
        <Spinner label="Решение поставлено в очередь…" />
        <small>{submission.sourceFileName}</small>
      </section>
    );
  }

  // Открытые примеры (с ожидаемым выводом) — их порядок совпадает с tests[].
  const openExamples = examples.filter((example) => example.output.trim() !== "");
  const accepted = submission.verdict === "accepted";
  const passedCount = submission.tests.filter((test) => test.verdict === "accepted").length;
  const totalCount = submission.tests.length;

  const toggleCase = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  };

  return (
    <section
      className={`code-result code-result--completed ${accepted ? "is-accepted" : "is-wrong"}`}
      aria-live="polite"
    >
      <header>
        <div>
          <span>Результат</span>
          <span className={`code-status-chip ${accepted ? "is-accepted" : "is-wrong"}`}>
            {accepted ? "✓" : "✗"} {verdictLabel(submission.verdict)}
          </span>
          <p className="code-summary">
            {totalCount > 0
              ? `${passedCount} из ${totalCount} тестов прошло`
              : verdictLabel(submission.verdict)}
          </p>
        </div>
      </header>

      {submission.failure && (
        <div className="code-failure">
          <strong>{submission.failure.code}</strong>
          <span>{submission.failure.message}</span>
        </div>
      )}

      {submission.compilation && (
        <ExecutionPhase title="Компиляция" phase={submission.compilation} />
      )}

      {submission.execution && (
        <ExecutionPhase title="Выполнение" phase={submission.execution} />
      )}

      {submission.tests.length > 0 && (
        <div className="code-tests">
          {submission.tests.map((test, index) => {
            const example = openExamples[index];
            const actual = test.stdout || test.stderr;
            const caseAccepted = test.verdict === "accepted";
            const isOpen = expanded.has(index);
            const mismatched =
              example !== undefined &&
              actual.trim() !== "" &&
              actual.trim() !== example.output.trim();

            return (
              <article className="code-test-case" key={test.testId}>
                <button
                  aria-expanded={isOpen}
                  className="code-test-case__header"
                  onClick={() => toggleCase(index)}
                  type="button"
                >
                  <strong>Тест {index + 1}</strong>

                  <span className={`code-status-chip ${caseAccepted ? "is-accepted" : "is-wrong"}`}>
                    {caseAccepted ? "✓" : "✗"} {verdictLabel(test.verdict)}
                  </span>

                  <span className="code-phase__metrics">
                    <span>{test.durationMs} мс</span>
                    <span>{formatFileSize(test.memoryBytes)}</span>
                  </span>

                  <span aria-hidden="true" className="code-test-case__chevron">
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>

                {isOpen && (
                  <div className="code-test-case__body">
                    {example && (
                      <div className="code-test-case__io">
                        <div>
                          <span>Вход</span>
                          <pre>{example.input || "(пусто)"}</pre>
                        </div>

                        <div>
                          <span>Ожидаемый вывод</span>
                          <pre>{example.output}</pre>
                        </div>

                        <div className={mismatched ? "is-wrong" : undefined}>
                          <span>Фактический вывод</span>
                          <pre>{actual === "" ? "(пусто)" : actual}</pre>
                        </div>
                      </div>
                    )}

                    {!example && actual !== "" && <pre>{actual}</pre>}

                    {test.stderr && <pre className="code-test-case__stderr">{test.stderr}</pre>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ExecutionPhase показывает метрики и безопасные stdout/stderr отдельной фазы.
function ExecutionPhase({ title, phase }: { title: string; phase: ITExecutionPhaseResult }) {
  return (
    <article className="code-phase">
      <header>
        <strong>{title}</strong>

        <div className="code-phase__metrics">
          {phase.exitCode != null && <span>exit {phase.exitCode}</span>}
          <span>{phase.durationMs} мс</span>
          <span>{formatFileSize(phase.memoryBytes)}</span>
        </div>
      </header>

      {(phase.stdout || phase.stderr) && <pre>{phase.stderr || phase.stdout}</pre>}
    </article>
  );
}

// verdictLabel переводит технический verdict в краткий пользовательский текст.
function verdictLabel(verdict?: ITExecutionVerdict | null) {
  const labels: Record<ITExecutionVerdict, string> = {
    accepted: "Решение принято",
    wrong_answer: "Неверный ответ",
    compilation_error: "Ошибка компиляции",
    runtime_error: "Ошибка выполнения",
    time_limit_exceeded: "Превышено время",
    memory_limit_exceeded: "Превышена память",
    output_limit_exceeded: "Слишком большой вывод",
    checker_error: "Ошибка проверяющей системы",
    infrastructure_error: "Ошибка инфраструктуры",
    cancelled: "Проверка отменена",
  };

  return verdict ? labels[verdict] : "Проверка завершена";
}

// formatFileSize форматирует размер исходника и использованной памяти.
function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} Б`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} КБ`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
