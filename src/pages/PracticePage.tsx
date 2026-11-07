import { useRef, useState, type FormEvent } from "react";
import { useApolloClient, useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import { type Topic } from "../api/catalog";
import { PRACTICE_PLAN_QUERY, PRACTICE_TOPICS_QUERY, type PracticePlan } from "../api/practice";
import { getErrorMessage } from "../api/errors";
import { ErrorMessage } from "../components/common/ErrorMessage";

const reasons: Record<string, string> = {
  START_TOPIC: "Начните знакомство с темой с этой задачи.",
  PRACTICE_GAP: "Закрепите тему после предыдущих ошибок.",
  NEXT_CHALLENGE: "Следующий шаг практики после успешных решений.",
  PREREQUISITE: "Начните с необходимой базы для выбранной темы.",
};
const warnings: Record<string, string> = {
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
  const [minutes, setMinutes] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ plan: PracticePlan; budget: number } | null>(null);
  const requestId = useRef(0);
  const budget = Number(minutes);
  const validBudget = minutes.trim() !== "" && Number.isInteger(budget) && budget >= 10 && budget <= 240;
  const validTopics = topicIds.length >= 1 && topicIds.length <= 5;
  const canSubmit = validBudget && validTopics && !loading;

  // Изменение формы инвалидирует и показанный результат, и ещё выполняющийся запрос.
  function clearResult() {
    requestId.current += 1;
    setResult(null);
    setError(null);
    setLoading(false);
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
        query: PRACTICE_PLAN_QUERY, variables: { topicIds, minutes: budget }, fetchPolicy: "no-cache",
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
        <h1>Подтянуть выбранные темы</h1>
        <p>Выберите темы и время — соберём задачи с учётом вашей истории решений.</p>
      </div>
    </header>
    <form className="practice-form" onSubmit={submit}>
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
        <label className="field">
          <span id="practice-time-label">Время на практику, минут</span>
          <input type="number" inputMode="numeric" min={10} max={240} step={1} value={minutes}
            aria-labelledby="practice-time-label" aria-describedby="practice-time-hint" aria-invalid={!validBudget}
            onChange={(event) => { clearResult(); setMinutes(event.target.value); }} />
          <small id="practice-time-hint">От 10 до 240 минут, целое число.</small>
        </label>
        <button className="button button--primary" type="submit" disabled={!canSubmit}>
          {loading ? "Подбираем…" : result ? "Пересчитать подборку" : "Подобрать практику"}
        </button>
      </div>
      <p className="practice-note">Это предварительная подборка: выбранные темы не сохраняются как учебная цель.
        После решения задач вернитесь сюда и пересчитайте подборку.</p>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <p role="status">Подбираем практику…</p>}
      <ErrorMessage message={error} />
      {result && <section className="practice-result" aria-labelledby="practice-result-title">
        <header>
          <h2 id="practice-result-title">Ваша подборка</h2>
          <p><strong>{result.plan.totalMinutes} из {result.budget} минут</strong> · Задач: {result.plan.items.length}</p>
          <p className="practice-note">Время приблизительное: ваш темп может отличаться. Подборка не является оценкой освоения темы.</p>
        </header>
        {result.plan.warnings.length > 0 && <ul className="practice-warnings" aria-label="Ограничения подборки">
          {Array.from(new Set(result.plan.warnings)).map((code) => <li key={code}>{warnings[code] ?? "Подборка может быть неполной. Попробуйте изменить темы или время."}</li>)}
        </ul>}
        {result.plan.items.length === 0 ? <div className="empty-state">
          <h3>Подходящих задач пока нет</h3><p>Измените темы или время и попробуйте ещё раз.</p>
        </div> : <ol className="practice-results">
          {result.plan.items.map((item) => <li className="practice-item" key={`${item.taskId}:${item.taskVersionId}`}>
            <div className="practice-item__meta">
              <span>{selectedTopics.find((topic) => topic.id === item.topicId)?.title ?? "Базовая тема"}</span>
              <span>{difficulties[item.difficulty] ?? "Задача"}</span>
              <span>{taskTypes[item.taskType] ?? "Практика"}</span>
              <span>≈ {item.estimatedMinutes} мин</span>
            </div>
            <h3><Link to={`/tasks/${item.taskId}`}>{item.title}</Link></h3>
            <p>{reasons[item.reasonCode] ?? "Задача подобрана для практики выбранных тем."}</p>
          </li>)}
        </ol>}
      </section>}
    </div>
  </main>;
}
