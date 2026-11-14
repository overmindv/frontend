import { useEffect, useRef, useState, type FormEvent } from "react";
import { gql, useApolloClient } from "@apollo/client";
import { SAVE_PLAN } from "../../api/savedPlans";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../api/errors";
import { ErrorMessage } from "../common/ErrorMessage";
import { useAuth } from "../../context/AuthContext";

export const LEARNING_PLAN_QUERY = gql`
  query GoalLearningPlan($goal: String!, $minutes: Int!, $sessionCount: Int!) {
    learningPlan(goal: $goal, minutes: $minutes, sessionCount: $sessionCount) {
      aiStatus warnings topics { id title }
      materials { id title url action minutes }
      practice { topicInsights { topicId title isTarget nextAction plannedTasks } warnings totalPlannedMinutes sessions { number totalMinutes items { taskId title estimatedMinutes } } }
    }
  }
`;
export interface GoalPlan {
  aiStatus: string; warnings: string[]; topics: { id: string; title: string }[];
  materials: { id: string; title: string; url: string; action: string; minutes: number }[];
  practice: { topicInsights: { topicId: string; title: string; isTarget: boolean; nextAction: string; plannedTasks: number }[]; warnings: string[]; totalPlannedMinutes: number; sessions: { number: number; totalMinutes: number; items: { taskId: string; title: string; estimatedMinutes: number }[] }[] } | null;
}
const coverage: Record<string, string> = {
  ADD_CONTENT: "В каталоге пока нет задач по этой теме.",
  NO_NEW_TASKS: "Все доступные задачи уже решены; нужны новые.",
  NEED_EASIER_TASKS: "Пока нет задач подходящей сложности.",
  COMPLETE_PREREQUISITES: "Сначала решите задачи по необходимой базе.",
  INCREASE_BUDGET: "Задачи не помещаются в выбранное время занятия.",
};
const notices: Record<string, string> = {
  PARTIAL_CATALOG: "Каталог большой: AI видел только часть тем.",
  NO_PRACTICE_TOPICS: "Подходящих тем с практикой в каталоге не выбрано. Начните с материалов; задачи нужно добавить отдельно.",
  NO_PRACTICE: "По выбранным темам пока нет подходящих новых задач.",
  PRACTICE_UNAVAILABLE: "Не удалось загрузить практику. Материалы доступны; повторите построение позже.",
  PARTIAL_DATA: "История или каталог задач получены частично.",
  SHORT_HORIZON: "Для всех занятий пока недостаточно подходящих задач.",
  PREREQUISITE_GAP: "Сначала нужна практика по базовым темам.",
  BUDGET_TOO_SMALL: "Увеличьте время занятия для доступных задач.",
  NO_ELIGIBLE_TASKS: "Новых подходящих задач пока нет.",
};

export function GoalLearningPlanner() {
  const client = useApolloClient();
 const navigate = useNavigate();
 const [saving, setSaving] = useState(false);
 const saveKey = useRef<string | null>(null);
  const { isAdmin } = useAuth();
  const [goal, setGoal] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [sessions, setSessions] = useState(3);
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
 useEffect(() => () => { generation.current++; }, []);
  function invalidate() { saveKey.current=null; generation.current++; setPlan(null); setError(null); setBusy(false); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!goal.trim() || busy) return;
    const current = ++generation.current;
    setBusy(true); setError(null); setPlan(null);
    try {
      const response = await client.query<{ learningPlan: GoalPlan }>({ query: LEARNING_PLAN_QUERY, variables: { goal: goal.trim(), minutes, sessionCount: sessions }, fetchPolicy: "no-cache" });
      if (current === generation.current) setPlan(response.data.learningPlan);
    } catch (cause) { if (current === generation.current) setError(getErrorMessage(cause)); }
    finally { if (current === generation.current) setBusy(false); }
  }
  async function save() {
    if(saving || !plan) return;
    const current = generation.current;
    setSaving(true);setError(null);saveKey.current ??= crypto.randomUUID();
    try {
      const response = await client.mutate<{saveLearningPlan:{id:string}}>({mutation:SAVE_PLAN,variables:{goal:goal.trim(),minutes,sessionCount:sessions,requestId:saveKey.current}});
      if(current === generation.current && response.data) navigate(`/plans/${response.data.saveLearningPlan.id}`);
    } catch {if(current === generation.current) setError("Не удалось сохранить план. Попробуйте ещё раз.");}
    finally {if(current === generation.current) setSaving(false);}
  }
  const success = plan && ["GENERATED", "CACHED"].includes(plan.aiStatus);
  return <section className="practice-form" aria-label="Учебный план по цели">
    <h2>От цели к учебному плану</h2>
<Link to="/plans">Мои планы →</Link>
    <p>Опишите, к чему готовитесь. AI подберёт темы, материалы и практику — выбирать темы заранее не нужно.</p>
    <form onSubmit={(event) => void submit(event)}>
      <label className="field"><span id="learning-goal-label">Что хотите освоить?</span>
        <textarea disabled={saving} aria-labelledby="learning-goal-label" aria-describedby="learning-goal-hint" required maxLength={1000} rows={3} value={goal}
          placeholder="Подготовь меня к собеседованию на Junior AI-инженера"
          onChange={(event) => { invalidate(); setGoal(event.target.value); }} />
      </label>
      <p id="learning-goal-hint" className="practice-note">Цель отправляется внешнему AI. Не вводите личные данные. Готовый план можно сохранить.</p>
      <div className="practice-controls">
        <label>Минут на практическое занятие <input type="number" disabled={saving} required min={10} max={240} value={minutes} onChange={(event) => { invalidate(); setMinutes(Number(event.target.value)); }} /></label>
        <label>Практических занятий <input type="number" disabled={saving} required min={1} max={8} value={sessions} onChange={(event) => { invalidate(); setSessions(Number(event.target.value)); }} /></label>
        <button className="button button--primary" disabled={saving || busy || !goal.trim()}>{busy ? "Составляем план…" : "Построить учебный план"}</button>
      </div>
    </form>
    {error && <ErrorMessage message={error} />}
    <div aria-live="polite" aria-busy={busy}>
      {plan && !success && <p role="status">{plan.aiStatus === "NO_MATCH" ? "В просмотренном каталоге для этой цели не нашлось подходящих тем и материалов. Уточните цель или выберите темы вручную ниже." : "AI сейчас недоступен или достигнут лимит. Повторите позже либо подберите практику вручную ниже."}</p>}
      {plan && !success && plan.warnings.includes("PARTIAL_CATALOG") && <p role="status">{notices.PARTIAL_CATALOG}</p>}
      {success && <>
        <h3>Ваш учебный маршрут</h3>
<button className="button button--primary" disabled={saving} onClick={() => void save()}>{saving ? "Сохраняем…" : "Сохранить план"}</button>
        {plan.aiStatus === "CACHED" && <p>Выбор тем взят из кеша; практика пересчитана по текущим результатам.</p>}
        {plan.topics.length > 0 && <p>Темы практики: {plan.topics.map((topic) => topic.title).join(", ")}.</p>}
        {[...new Set([...plan.warnings, ...(plan.practice?.warnings ?? [])])].map((warning) => <p role="status" key={warning}>{notices[warning] ?? "План составлен по ограниченным данным."}</p>)}
        <h3>Изучить и закрепить</h3>
        <p className="practice-note">Это первые шаги по материалам, а не время прохождения курсов целиком. Чтение не считается подтверждением знания.</p>
        {plan.materials.length === 0 ? <p>Проверенных материалов для этой цели пока не подобрано.</p> : <ol>{plan.materials.map((material) => <li key={material.id}>
          <a href={material.url} target="_blank" rel="noopener noreferrer">{material.title}</a> · ≈ {material.minutes} мин на первый шаг
          <p>{material.action}</p>
        </li>)}</ol>}
        <h3>Практика на платформе</h3>
        {plan.practice?.topicInsights.filter((topic) => topic.isTarget).map((topic) => <p key={topic.topicId}>
          <strong>{topic.title}:</strong> {coverage[topic.nextAction] ?? (topic.plannedTasks > 0 ? `В плане задач: ${topic.plannedTasks}.` : "Не вошла в текущий горизонт; увеличьте число занятий или пересчитайте план после решений.")}
        </p>)}
        <p>Материалы: ≈ {plan.materials.reduce((sum, item) => sum + item.minutes, 0)} мин. Практика: ≈ {plan.practice?.totalPlannedMinutes ?? 0} мин отдельно.</p>
        {plan.practice?.sessions.map((session) => <section key={session.number}>
          <h4>Занятие {session.number} · ≈ {session.totalMinutes} мин</h4>
          <ol>{session.items.map((item) => <li key={item.taskId}><Link to={`/tasks/${item.taskId}`}>{item.title}</Link> · ≈ {item.estimatedMinutes} мин</li>)}</ol>
        </section>)}
        <p>После решений нажмите «Построить учебный план» снова: выполненные задачи будут учтены.</p>
        {isAdmin && <Link to="/admin/collected-tasks">Найти и добавить задачи через модерацию</Link>}
        <p><a href={`https://duckduckgo.com/?q=${encodeURIComponent((plan.topics.map((topic) => topic.title).join(" ") || plan.materials[0]?.title || "programming") + " practice exercises")}`} target="_blank" rel="noopener noreferrer">Искать дополнительные упражнения в интернете</a> — внешний поиск; найденные задачи ещё не добавлены на платформу.</p>
      </>}
    </div>
  </section>;
}
