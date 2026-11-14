import { useEffect, useRef, useState, type FormEvent } from "react";
import { useApolloClient, useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import { type Topic } from "../api/catalog";
import { DELETE_PRACTICE_GOAL_MUTATION, PRACTICE_GOAL_QUERY, PRACTICE_PLAN_QUERY, PRACTICE_TOPICS_QUERY, SAVE_PRACTICE_GOAL_MUTATION, type PracticeGoal, type PracticePlan } from "../api/practice";
import { getErrorMessage } from "../api/errors";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { GoalLearningPlanner } from "../components/practice/GoalLearningPlanner";
import { LearningRoute } from "../components/practice/LearningRoute";
import { ShareButton } from "../components/progress/ShareButton";

const reasons: Record<string, string> = {
  START_TOPIC: "Начните знакомство с темой с этой задачи.",
  PRACTICE_GAP: "Закрепите тему после предыдущих ошибок.",
  NEXT_CHALLENGE: "Следующий шаг практики после успешных решений.",
  PREREQUISITE: "Начните с необходимой базы для выбранной темы.",
};
const warnings: Record<string, string> = {
  SHORT_HORIZON: "Для всего маршрута пока недостаточно подходящих задач. Начните с доступных занятий и пересчитайте план после решений.",
  PARTIAL_DATA: "Использована только часть доступных задач или истории. Подборка может быть неполной.",
  NO_ELIGIBLE_TASKS: "Нет новых подходящих задач для выбранных тем. Попробуйте другие темы.",
  BUDGET_TOO_SMALL: "Увеличьте время: подходящие задачи не помещаются в оставшийся бюджет.",
  PREREQUISITE_GAP: "В истории пока недостаточно успешной практики по базовым темам. Рекомендуем сначала потренировать необходимую базу.",
};
const difficulties: Record<string, string> = { easy: "Лёгкая", medium: "Средняя", hard: "Сложная" };
const taskTypes: Record<string, string> = { single_choice: "Один ответ", multiple_choice: "Несколько ответов", programming: "Программирование" };

type PracticeTopic = Pick<Topic, "id" | "title" | "status">;
const topicPageSize = 20;

export function PracticePage() {
  const client = useApolloClient();
  const savedGoalQuery = useQuery<{ myPracticeGoal: PracticeGoal | null }>(PRACTICE_GOAL_QUERY, { fetchPolicy: "network-only" });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const catalog = useQuery<{ topics: PracticeTopic[] }>(PRACTICE_TOPICS_QUERY, {
    variables: { search, limit: topicPageSize + 1, offset }, fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const pageTopics = catalog.data?.topics ?? [];
  const topics = pageTopics.slice(0, topicPageSize).filter((topic) => topic.status === "active");
  // Выбор хранится отдельно от страницы каталога и сохраняется при поиске.
  const [selectedTopics, setSelectedTopics] = useState<PracticeTopic[]>([]);
  const topicIds = selectedTopics.map((topic) => topic.id);
  const [goalText, setGoalText] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [sessionCount, setSessionCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [savedGoal, setSavedGoal] = useState<PracticeGoal | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [result, setResult] = useState<{ plan: PracticePlan; budget: number } | null>(null);
  const requestId = useRef(0);
  const goalLoaded = useRef(false);
  const goalMutated = useRef(false);
  const userEdited = useRef(false);
  const budget = Number(minutes);
  const validBudget = minutes.trim() !== "" && Number.isInteger(budget) && budget >= 10 && budget <= 240;
  const validTopics = topicIds.length >= 1 && topicIds.length <= 5 && selectedTopics.every((topic) => topic.status === "active");
  const canSubmit = validBudget && validTopics && !loading;
  const goalMatches = savedGoal !== null && savedGoal.minutes === budget && savedGoal.sessionCount === sessionCount && savedGoal.topics.map((topic) => topic.id).join(",") === topicIds.join(",");

  useEffect(() => {
    if (!savedGoalQuery.data || goalLoaded.current) return;
    goalLoaded.current = true;
    if (goalMutated.current) return;
    const goal = savedGoalQuery.data.myPracticeGoal;
    setSavedGoal(goal);
    if (!goal || userEdited.current) return;
    setSelectedTopics(goal.topics);
    setMinutes(String(goal.minutes));
    setSessionCount(goal.sessionCount);
    if (goal.topics.some((topic) => topic.status !== "active")) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    void client.query<{ practicePlan: PracticePlan }>({
      query: PRACTICE_PLAN_QUERY, variables: { topicIds: goal.topics.map((topic) => topic.id), minutes: goal.minutes, sessionCount: goal.sessionCount }, fetchPolicy: "no-cache",
    }).then((response) => {
      if (currentRequest === requestId.current) setResult({ plan: response.data.practicePlan, budget: goal.minutes });
    }).catch((cause: unknown) => {
      if (currentRequest === requestId.current) setError(getErrorMessage(cause));
    }).finally(() => {
      if (currentRequest === requestId.current) setLoading(false);
    });
  }, [client, savedGoalQuery.data]);

  // Изменение формы инвалидирует и показанный результат, и ещё выполняющийся запрос.
  function clearResult() {
    userEdited.current = true;
    requestId.current += 1;
    setResult(null);
    setError(null);
    setLoading(false);
  }

  async function saveGoal() {
    if (!validBudget || !validTopics || savingGoal) return;
    setSavingGoal(true);
    setGoalError(null);
    try {
      const response = await client.mutate<{ savePracticeGoal: PracticeGoal }>({
        mutation: SAVE_PRACTICE_GOAL_MUTATION, variables: { topicIds, minutes: budget, sessionCount },
      });
      if (response.data) {
        goalMutated.current = true;
        setSavedGoal(response.data.savePracticeGoal);
      }
    } catch (cause) {
      setGoalError(getErrorMessage(cause));
    } finally {
      setSavingGoal(false);
    }
  }

  async function deleteGoal() {
    setSavingGoal(true);
    setGoalError(null);
    try {
      await client.mutate({ mutation: DELETE_PRACTICE_GOAL_MUTATION });
      goalMutated.current = true;
      setSavedGoal(null);
    } catch (cause) {
      setGoalError(getErrorMessage(cause));
    } finally {
      setSavingGoal(false);
    }
  }

  function findTopics() {
    setOffset(0);
    setSearch(searchInput.trim());
  }

  function removeTopic(id: string) {
    clearResult();
    setSelectedTopics((selected) => selected.filter((topic) => topic.id !== id));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await client.query<{ practicePlan: PracticePlan }>({
        query: PRACTICE_PLAN_QUERY, variables: { topicIds, minutes: budget, sessionCount, ...(goalText.trim() ? { goal: goalText.trim() } : {}) }, fetchPolicy: "no-cache",
      });
      if (currentRequest === requestId.current) setResult({ plan: response.data.practicePlan, budget });
    } catch (cause) {
      if (currentRequest === requestId.current) setError(getErrorMessage(cause));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }

  return <main className="page-shell practice-page">
    <header className="page-heading">
      <div>
        <h1>Индивидуальный план</h1>
        <p>Выберите цель и комфортный темп. Построим маршрут занятий с учётом ваших решений и необходимой базы.</p>
      </div>
    </header>
    <GoalLearningPlanner />
    <h2>Или выберите темы вручную</h2>
    <form className="practice-form" onSubmit={submit}>
      <label className="field"><span id="practice-ai-label">Цель для AI (необязательно)</span>
        <textarea aria-labelledby="practice-ai-label" aria-describedby="practice-ai-hint" value={goalText} maxLength={1000} rows={3} placeholder="Подготовиться к собеседованию на Junior AI-инженера"
          onChange={(event) => { clearResult(); setGoalText(event.target.value); }} />
        <small id="practice-ai-hint">AI расставит приоритеты задач внутри выбранных ниже тем. При построении цель и обезличенная сводка решений отправляются внешнему AI. Не вводите личные данные. Кнопка «Сохранить цель» сохраняет только темы и темп, без этого текста.</small>
      </label>
      <fieldset className="practice-topics" aria-describedby="practice-topics-hint">
        <legend>Темы для практики</legend>
        <p id="practice-topics-hint">Выберите от 1 до 5 активных тем. Выбрано: {topicIds.length} из 5.</p>
        {selectedTopics.length > 0 && <ul className="practice-selected" aria-label="Выбранные темы">
          {selectedTopics.map((topic) => <li key={topic.id}>
            <span>{topic.title}</span>
            <button className="button button--small" type="button" aria-label={`Убрать тему ${topic.title}`} onClick={() => removeTopic(topic.id)}>Убрать</button>
          </li>)}
        </ul>}
        <div className="practice-search">
          <label className="field">
            <span>Поиск активных тем</span>
            <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); findTopics(); } }} />
          </label>
          <button className="button" type="button" onClick={findTopics}>Найти темы</button>
        </div>
        {catalog.loading && <p role="status">Загружаем темы…</p>}
        {catalog.error && <div>
          <ErrorMessage message={getErrorMessage(catalog.error)} />
          <button className="button" type="button" onClick={() => { void catalog.refetch().catch(() => undefined); }}>Загрузить темы снова</button>
        </div>}
        {!catalog.loading && !catalog.error && topics.length === 0 && <p>
          {search ? "По вашему запросу темы не найдены" : offset > 0 ? "На этой странице тем больше нет" : "Активных тем пока нет"}
        </p>}
        {!catalog.loading && !catalog.error && <div className="practice-topic-list">
          {topics.map((topic) => <label className="practice-topic" key={topic.id}>
            <input type="checkbox" checked={topicIds.includes(topic.id)} disabled={!topicIds.includes(topic.id) && topicIds.length >= 5}
              onChange={(event) => {
                clearResult();
                setSelectedTopics((selected) => event.target.checked ? [...selected, topic] : selected.filter((item) => item.id !== topic.id));
              }} />
            <span>{topic.title}</span>
          </label>)}
        </div>}
        <nav className="practice-pagination" aria-label="Страницы тем">
          <button className="button button--small" type="button" aria-label="Предыдущая страница тем"
            disabled={catalog.loading || offset === 0} onClick={() => setOffset((value) => Math.max(0, value - topicPageSize))}>Назад</button>
          <span aria-live="polite">Страница {Math.floor(offset / topicPageSize) + 1}</span>
          <button className="button button--small" type="button" aria-label="Следующая страница тем"
            disabled={catalog.loading || Boolean(catalog.error) || pageTopics.length <= topicPageSize} onClick={() => setOffset((value) => value + topicPageSize)}>Далее</button>
        </nav>
      </fieldset>
      <div className="practice-controls">
        <label className="field"><span>Занятий в плане</span>
          <select aria-label="Занятий в плане" value={sessionCount} onChange={(event) => { clearResult(); setSessionCount(Number(event.target.value)); }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}
          </select><small>От 1 до 8 занятий. Пересчитывайте после решений.</small>
        </label>
        <label className="field">
          <span id="practice-time-label">Время на практику, минут</span>
          <input type="number" inputMode="numeric" min={10} max={240} step={1} value={minutes}
            aria-labelledby="practice-time-label" aria-describedby="practice-time-hint" aria-invalid={!validBudget}
            onChange={(event) => { clearResult(); setMinutes(event.target.value); }} />
          <small id="practice-time-hint">На одно занятие: от 10 до 240 минут.</small>
          <span className="practice-presets">{[20, 30, 60].map((value) => <button key={value} className="button button--small" type="button" aria-pressed={budget === value} onClick={() => { clearResult(); setMinutes(String(value)); }}>{value} мин</button>)}</span>
        </label>
        <button className="button button--primary" type="submit" disabled={!canSubmit}>
          {loading ? "Подбираем…" : result ? "Пересчитать подборку" : "Подобрать практику"}
        </button>
        <button className="button" type="button" disabled={!validBudget || !validTopics || savingGoal} onClick={() => { void saveGoal(); }}>
          {savingGoal ? "Сохраняем…" : "Сохранить цель"}
        </button>
        {savedGoal && <button className="button" type="button" disabled={savingGoal} onClick={() => { void deleteGoal(); }}>Удалить сохранённую цель</button>}
      </div>
      {savedGoalQuery.loading && <p role="status">Загружаем сохранённую цель…</p>}
      {goalMatches && <p className="practice-note">Цель сохранена. При возвращении подборка обновится по вашим решениям.</p>}
      {selectedTopics.some((topic) => topic.status !== "active") && <p className="practice-note">Сохранённая тема больше недоступна. Уберите её и выберите активную тему.</p>}
      <ErrorMessage message={goalError ?? (savedGoalQuery.error ? getErrorMessage(savedGoalQuery.error) : null)} />
      <p className="practice-note">Подборка остаётся предварительной: сохранённая цель хранит темы, число занятий и время каждого, но не подтверждает освоение темы.</p>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p role="status">Подбираем практику…</p>}
      <ErrorMessage message={error} />
      {result && <section className="practice-result" aria-labelledby="practice-result-title">
        <header>
          <h2 id="practice-result-title">Ваш маршрут</h2>
          {result.plan.aiStatus === "GENERATED" && <p role="status">Порядок задач подобран AI по вашей цели.</p>}
          {result.plan.aiStatus === "CACHED" && <p role="status">AI-план уже готов: цель и результаты не изменились.</p>}
          {["UNAVAILABLE", "LIMIT_REACHED", "BUSY", "REFUSED"].includes(result.plan.aiStatus) && <p role="status">AI сейчас недоступен. Показан обычный план по вашим результатам; попробуйте AI позже.</p>}
          {result.plan.aiStatus === "NO_CANDIDATES" && <p>Для AI-подбора пока нет доступных задач. Измените темы или время.</p>}
          <p><strong>{result.plan.totalMinutes} из {result.budget} минут</strong> · Задач: {result.plan.items.length}</p>
          <p className="practice-note">Время приблизительное: ваш темп может отличаться. Подборка не является оценкой освоения темы.</p>
        </header>
        {result.plan.warnings.length > 0 && <ul className="practice-warnings" aria-label="Ограничения подборки">
          {Array.from(new Set(result.plan.warnings)).map((code) => <li key={code}>{warnings[code] ?? "Подборка может быть неполной. Попробуйте изменить темы или время."}</li>)}
        </ul>}
        {result.plan.topicInsights?.length > 0 && <LearningRoute plan={result.plan} budget={result.budget} onBudget={(value) => { clearResult(); setMinutes(String(value)); }} />}
        {result.plan.items.length === 0 ? <div className="empty-state">
          <h3>Подходящих задач пока нет</h3><p>Измените темы или время и попробуйте ещё раз.</p>
        </div> : <ol className="practice-results" aria-label="Задачи первого занятия">
          {result.plan.items.map((item) => <li className="practice-item" key={`${item.taskId}:${item.taskVersionId}`}>
            <div className="practice-item__meta">
              <span>{selectedTopics.find((topic) => topic.id === item.topicId)?.title ?? "Базовая тема"}</span>
              <span>{difficulties[item.difficulty] ?? "Задача"}</span>
              <span>{taskTypes[item.taskType] ?? "Практика"}</span>
              <span>≈ {item.estimatedMinutes} мин</span>
            </div>
            <h3><Link to={`/tasks/${item.taskId}`}>{item.title}</Link></h3>
            <p>{reasons[item.reasonCode] ?? "Задача подобрана для практики выбранных тем."}</p>
            <ShareButton path={`/tasks/${item.taskId}`} title={item.title} label={`Поделиться задачей ${item.title}`} />
          </li>)}
        </ol>}
      </section>}
    </div>
  </main>;
}
