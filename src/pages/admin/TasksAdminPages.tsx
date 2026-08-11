import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Topic } from "../../api/catalog";
import { getErrorMessage } from "../../api/errors";
import {
  ADMIN_IT_TASK_QUERY,
  ADMIN_IT_TASKS_QUERY,
  CHANGE_IT_TASK_STATUS,
  CREATE_IT_TASK,
  DELETE_IT_TASK,
  IT_TASK_TOPICS_QUERY,
  UPDATE_IT_TASK,
  type ITAdminTaskFilter,
  type ITTask,
  type ITTaskDifficulty,
  type ITTaskInput,
  type ITTaskList,
  type ITTaskStatus,
  type ITTaskType,
} from "../../api/tasks";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Spinner } from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";

const adminPageSize = 20;

interface EditableOption {
  key: string;
  text: string;
  isCorrect: boolean;
}

interface TaskFormState {
  topicId: string;
  title: string;
  statement: string;
  taskType: ITTaskType;
  difficulty: ITTaskDifficulty;
  options: EditableOption[];
}

// AdminTasksPage показывает все тесты и управляет lifecycle.
export function AdminTasksPage() {
  const { isAdmin } = useAuth();
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<ITTaskStatus | "">("");
  const [taskType, setTaskType] = useState<ITTaskType | "">("");
  const [difficulty, setDifficulty] = useState<ITTaskDifficulty | "">("");
  const filter: ITAdminTaskFilter = {
    ...(status ? { status } : {}),
    ...(taskType ? { taskType } : {}),
    ...(difficulty ? { difficulty } : {}),
  };
  const { data, loading, error, refetch } = useQuery<{ adminITTasks: ITTaskList }>(
    ADMIN_IT_TASKS_QUERY,
    {
      variables: { filter, pagination: { limit: adminPageSize, offset } },
      skip: !isAdmin,
      fetchPolicy: "cache-and-network",
    },
  );
  const items = data?.adminITTasks.items ?? [];

  if (!isAdmin) {
    return <AdminDenied />;
  }

  return (
    <main className="page-shell admin-tasks">
      <header className="section-heading">
        <div>
          <span className="eyebrow">Управление контентом</span>
          <h1>IT-задачи</h1>
        </div>
        <Link className="button button--primary" to="/admin/tasks/new">Создать тест</Link>
      </header>

      <section className="admin-filterbar">
        <AdminSelect label="Статус" value={status} onChange={(value) => { setStatus(value as ITTaskStatus | ""); setOffset(0); }} options={[["", "Все"], ["draft", "Черновик"], ["published", "Опубликован"], ["archived", "В архиве"]]} />
        <AdminSelect label="Тип" value={taskType} onChange={(value) => { setTaskType(value as ITTaskType | ""); setOffset(0); }} options={[["", "Все"], ["single_choice", "Один ответ"], ["multiple_choice", "Несколько ответов"], ["programming", "Программирование"]]} />
        <AdminSelect label="Сложность" value={difficulty} onChange={(value) => { setDifficulty(value as ITTaskDifficulty | ""); setOffset(0); }} options={[["", "Любая"], ["easy", "Начальная"], ["medium", "Средняя"], ["hard", "Сложная"]]} />
      </section>

      {error && <ErrorMessage message={getErrorMessage(error)} />}
      {loading && !data ? (
        <div className="panel panel--center"><Spinner label="Загружаем тесты…" /></div>
      ) : items.length === 0 ? (
        <section className="empty-state"><span>00</span><h2>Ничего не найдено</h2><p>Измените фильтры или создайте первый тест.</p></section>
      ) : (
        <div className="admin-task-list">
          {items.map((task) => <AdminTaskRow key={task.id} task={task} refetch={refetch} />)}
        </div>
      )}

      {(offset > 0 || items.length === adminPageSize) && (
        <nav className="pagination" aria-label="Пагинация">
          <button className="button button--ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - adminPageSize))}>← Назад</button>
          <span>Страница {Math.floor(offset / adminPageSize) + 1}</span>
          <button className="button button--ghost" disabled={items.length < adminPageSize} onClick={() => setOffset(offset + adminPageSize)}>Дальше →</button>
        </nav>
      )}
    </main>
  );
}

// AdminTaskFormPage создаёт тест или сохраняет новую неизменяемую версию.
export function AdminTaskFormPage({ create = false }: { create?: boolean }) {
  const { id = "" } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const initialized = useRef(false);
  const [form, setForm] = useState<TaskFormState>(() => emptyTaskForm());
  const [validationError, setValidationError] = useState<string | null>(null);
  const taskQuery = useQuery<{ adminITTask: ITTask }>(ADMIN_IT_TASK_QUERY, {
    variables: { id },
    skip: create || !isAdmin,
  });
  const topicsQuery = useQuery<{ topics: Topic[] }>(IT_TASK_TOPICS_QUERY, { skip: !isAdmin });
  const [createTask, createState] = useMutation<{ createITTask: ITTask }, { input: ITTaskInput }>(CREATE_IT_TASK);
  const [updateTask, updateState] = useMutation<{ updateITTask: ITTask }, { id: string; input: ITTaskInput }>(UPDATE_IT_TASK);

  useEffect(() => {
    const task = taskQuery.data?.adminITTask;
    if (!task || initialized.current) return;
    initialized.current = true;
    setForm({
      topicId: task.topicId ?? "",
      title: task.title,
      statement: task.statement,
      taskType: task.taskType,
      difficulty: task.difficulty,
      options: task.options.map((option) => ({
        key: option.id,
        text: option.text,
        isCorrect: Boolean(option.isCorrect),
      })),
    });
  }, [taskQuery.data?.adminITTask]);

  // updateOption изменяет одно поле локального варианта.
  const updateOption = (key: string, patch: Partial<EditableOption>) => {
    setValidationError(null);
    setForm((current) => ({
      ...current,
      options: current.options.map((option) => option.key === key ? { ...option, ...patch } : option),
    }));
  };

  // selectCorrect применяет одиночный или множественный режим ответа.
  const selectCorrect = (key: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option) => ({
        ...option,
        isCorrect: current.taskType === "single_choice" ? option.key === key : option.key === key ? checked : option.isCorrect,
      })),
    }));
  };

  // addOption добавляет пустой вариант в пределах серверного лимита.
  const addOption = () => {
    setForm((current) => current.options.length >= 20 ? current : {
      ...current,
      options: [...current.options, newOption()],
    });
  };

  // removeOption удаляет вариант, сохраняя минимум два поля.
  const removeOption = (key: string) => {
    setForm((current) => current.options.length <= 2 ? current : {
      ...current,
      options: current.options.filter((option) => option.key !== key),
    });
  };

  // changeTaskType нормализует правильные варианты при смене типа.
  const changeTaskType = (taskType: ITTaskType) => {
    setForm((current) => {
      const firstCorrect = current.options.find((option) => option.isCorrect)?.key ?? current.options[0]?.key;

      return {
        ...current,
        taskType,
        options: taskType === "programming"
          ? []
          : taskType === "single_choice"
          ? current.options.map((option) => ({ ...option, isCorrect: option.key === firstCorrect }))
          : current.options.length >= 2 ? current.options : [{ ...newOption(), isCorrect: true }, newOption()],
      };
    });
  };

  // submitTask валидирует форму и передаёт полный набор вариантов.
  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = formInput(form);
    const message = validateTaskInput(input);
    if (message) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    try {
      if (create) {
        const result = await createTask({ variables: { input } });
        const taskID = result.data?.createITTask.id;
        navigate(taskID ? `/admin/tasks/${taskID}` : "/admin/tasks");
      } else {
        await updateTask({ variables: { id, input } });
        navigate("/admin/tasks");
      }
    } catch {
      return;
    }
  };

  if (!isAdmin) return <AdminDenied />;
  if ((!create && taskQuery.loading) || topicsQuery.loading) {
    return <main className="page-shell panel panel--center"><Spinner label="Загружаем редактор…" /></main>;
  }

  const requestError = taskQuery.error ?? topicsQuery.error ?? createState.error ?? updateState.error;

  return (
    <main className="page-shell task-editor">
      <header className="editor-heading">
        <div>
          <Link className="back-link" to="/admin/tasks">← К списку тестов</Link>
          <span className="eyebrow">{create ? "Новый материал" : `Версия ${taskQuery.data?.adminITTask.versionNumber ?? "—"}`}</span>
          <h1>{create ? "Создание теста" : "Новая версия теста"}</h1>
          <p>{create ? "После сохранения тест останется черновиком." : "Предыдущая версия и результаты пользователей сохранятся без изменений."}</p>
        </div>
        {!create && <span className="status-tag">{statusLabel(taskQuery.data?.adminITTask.status ?? "draft")}</span>}
      </header>

      {(validationError || requestError) && <ErrorMessage message={validationError ?? getErrorMessage(requestError)} />}

      <form className="editor-form" onSubmit={(event) => void submitTask(event)}>
        <section className="editor-section">
          <div className="editor-section__number">01</div>
          <div className="editor-section__content">
            <div className="editor-section__heading"><h2>Условие</h2><p>Короткое название и понятная формулировка.</p></div>
            <label className="field"><span>Название</span><input maxLength={200} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label className="field"><span>Условие</span><textarea maxLength={50000} required rows={7} value={form.statement} onChange={(event) => setForm({ ...form, statement: event.target.value })} /></label>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section__number">02</div>
          <div className="editor-section__content">
            <div className="editor-section__heading"><h2>Классификация</h2><p>Тема необязательна и может быть назначена позже.</p></div>
            <div className="form-grid form-grid--three">
              <label className="field"><span>Тип</span><select value={form.taskType} onChange={(event) => changeTaskType(event.target.value as ITTaskType)}><option value="single_choice">Один ответ</option><option value="multiple_choice">Несколько ответов</option><option value="programming">Программирование</option></select></label>
              <label className="field"><span>Сложность</span><select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value as ITTaskDifficulty })}><option value="easy">Начальная</option><option value="medium">Средняя</option><option value="hard">Сложная</option></select></label>
              <label className="field"><span>Тема</span><select value={form.topicId} onChange={(event) => setForm({ ...form, topicId: event.target.value })}><option value="">Без темы</option>{topicsQuery.data?.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>
            </div>
          </div>
        </section>

        {form.taskType !== "programming" && <section className="editor-section">
          <div className="editor-section__number">03</div>
          <div className="editor-section__content">
            <div className="editor-section__heading editor-section__heading--actions">
              <div><h2>Варианты ответа</h2><p>{form.taskType === "single_choice" ? "Отметьте ровно один правильный вариант." : "Отметьте все правильные варианты."}</p></div>
              <button className="button button--ghost button--small" disabled={form.options.length >= 20} onClick={addOption} type="button">+ Добавить вариант</button>
            </div>
            <div className="option-editor-list">
              {form.options.map((option, index) => (
                <div className="option-editor" key={option.key}>
                  <span className="option-editor__index">{String(index + 1).padStart(2, "0")}</span>
                  <input aria-label={`Вариант ${index + 1}`} maxLength={2000} placeholder="Текст варианта" required value={option.text} onChange={(event) => updateOption(option.key, { text: event.target.value })} />
                  <label className="correct-toggle">
                    <input checked={option.isCorrect} name={form.taskType === "single_choice" ? "correct" : undefined} onChange={(event) => selectCorrect(option.key, event.target.checked)} type={form.taskType === "single_choice" ? "radio" : "checkbox"} />
                    <span>верный</span>
                  </label>
                  <button aria-label={`Удалить вариант ${index + 1}`} className="icon-button" disabled={form.options.length <= 2} onClick={() => removeOption(option.key)} type="button">×</button>
                </div>
              ))}
            </div>
          </div>
        </section>}

        <footer className="editor-actions">
          <Link className="button button--ghost" to="/admin/tasks">Отмена</Link>
          <button className="button button--primary" disabled={createState.loading || updateState.loading}>
            {createState.loading || updateState.loading ? <Spinner label="Сохраняем…" /> : create ? "Создать черновик" : "Сохранить новую версию"}
          </button>
        </footer>
      </form>
    </main>
  );
}

// AdminTaskRow отображает тест и доступные lifecycle-действия.
function AdminTaskRow({ task, refetch }: { task: ITTaskList["items"][number]; refetch: () => Promise<unknown> }) {
  const [changeStatus, statusState] = useMutation(CHANGE_IT_TASK_STATUS);
  const [deleteTask, deleteState] = useMutation(DELETE_IT_TASK);
  const next = nextStatus(task.status);

  // applyStatus выполняет допустимый следующий lifecycle-переход.
  const applyStatus = async () => {
    await changeStatus({ variables: { id: task.id, status: next.status } });
    await refetch();
  };

  // removeTask подтверждает и выполняет soft delete.
  const removeTask = async () => {
    if (!window.confirm(`Удалить тест «${task.title}»?`)) return;
    await deleteTask({ variables: { id: task.id } });
    await refetch();
  };

  return (
    <article className="admin-task-row">
      <div className="admin-task-row__status"><span className={`status-dot status-dot--${task.status}`} />{statusLabel(task.status)}</div>
      <div className="admin-task-row__main">
        <strong>{task.title}</strong>
        <span>{typeLabel(task.taskType)} · {difficultyLabel(task.difficulty)} · версия {task.versionNumber}</span>
      </div>
      <div className="admin-task-row__actions">
        {task.taskType === "programming" ? (
          <Link className="text-link" to={`/tasks/${task.id}`}>Открыть</Link>
        ) : (
          <Link className="text-link" to={`/admin/tasks/${task.id}`}>Редактировать</Link>
        )}
        <button className="text-button" disabled={statusState.loading} onClick={() => void applyStatus()}>{next.label}</button>
        <button className="text-button text-button--danger" disabled={deleteState.loading} onClick={() => void removeTask()}>Удалить</button>
      </div>
      {(statusState.error || deleteState.error) && <ErrorMessage message={getErrorMessage(statusState.error ?? deleteState.error)} />}
    </article>
  );
}

// AdminSelect отображает один фильтр административного списка.
function AdminSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="filter-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}

// AdminDenied показывает нейтральное сообщение о недостаточных правах.
function AdminDenied() {
  return <main className="page-shell panel"><ErrorMessage message="Раздел доступен только администраторам." /></main>;
}

// emptyTaskForm возвращает начальное состояние валидного теста.
function emptyTaskForm(): TaskFormState {
  return {
    topicId: "",
    title: "",
    statement: "",
    taskType: "single_choice",
    difficulty: "easy",
    options: [{ ...newOption(), isCorrect: true }, newOption()],
  };
}

// newOption создаёт локальный вариант ответа.
function newOption(): EditableOption {
  return { key: crypto.randomUUID(), text: "", isCorrect: false };
}

// formInput нормализует состояние редактора для GraphQL mutation.
function formInput(form: TaskFormState): ITTaskInput {
  return {
    topicId: form.topicId || null,
    title: form.title.trim(),
    statement: form.statement.trim(),
    taskType: form.taskType,
    difficulty: form.difficulty,
    options: form.options.map((option) => ({ text: option.text.trim(), isCorrect: option.isCorrect })),
  };
}

// validateTaskInput проверяет понятные ограничения до отправки на сервер.
function validateTaskInput(input: ITTaskInput) {
  if (!input.title || !input.statement) return "Заполните название и условие.";
  if (input.taskType === "programming") return input.options.length === 0 ? null : "У programming-задачи не должно быть вариантов ответа.";
  if (input.options.length < 2) return "Добавьте минимум два варианта ответа.";
  if (input.options.some((option) => !option.text)) return "Заполните текст каждого варианта.";
  const normalized = input.options.map((option) => option.text.toLocaleLowerCase("ru-RU"));
  if (new Set(normalized).size !== normalized.length) return "Варианты ответа не должны повторяться.";
  const correct = input.options.filter((option) => option.isCorrect).length;
  if (input.taskType === "single_choice" && correct !== 1) return "Для одиночного выбора отметьте один правильный вариант.";
  if (input.taskType === "multiple_choice" && (correct === 0 || correct === input.options.length)) return "Для множественного выбора нужен хотя бы один верный и один неверный вариант.";

  return null;
}

// nextStatus возвращает следующий допустимый lifecycle-переход.
function nextStatus(status: ITTaskStatus): { status: ITTaskStatus; label: string } {
  if (status === "draft") return { status: "published", label: "Опубликовать" };
  if (status === "published") return { status: "archived", label: "В архив" };

  return { status: "draft", label: "Вернуть в черновики" };
}

// statusLabel переводит lifecycle-статус.
function statusLabel(status: ITTaskStatus) {
  return { draft: "Черновик", published: "Опубликован", archived: "В архиве" }[status];
}

// typeLabel переводит тип теста.
function typeLabel(taskType: ITTaskType) {
  if (taskType === "programming") return "Программирование";
  return taskType === "single_choice" ? "Один ответ" : "Несколько ответов";
}

// difficultyLabel переводит сложность теста.
function difficultyLabel(difficulty: ITTaskDifficulty) {
  return { easy: "Начальная", medium: "Средняя", hard: "Сложная" }[difficulty];
}
