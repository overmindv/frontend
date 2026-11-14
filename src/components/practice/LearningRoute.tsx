import { Link } from "react-router-dom";
import type { PracticePlan } from "../../api/practice";

const actions: Record<string, string> = {
  COMPLETE_PREREQUISITES: "Сначала укрепите базовые темы",
  ADD_CONTENT: "В этой теме пока нет опубликованных задач",
  NO_NEW_TASKS: "Все доступные задачи уже решены. Это не означает завершение обучения",
  NEED_EASIER_TASKS: "В каталоге пока нет задач подходящей сложности",
  INCREASE_BUDGET: "Подходящей задаче нужно больше времени",
  PRACTICE: "Можно практиковаться",
};
const levels: Record<string, string> = { easy: "Лёгкая", medium: "Средняя", hard: "Сложная" };

export function LearningRoute({ plan, budget, onBudget }: { plan: PracticePlan; budget: number; onBudget: (value: number) => void }) {
  const first = plan.sessions[0]?.items[0];
  return <div className="learning-route">
    <div className="learning-route__summary">
      <div><strong>{plan.sessions.length} из {plan.requestedSessions}</strong><span>занятий собрано</span></div>
      <div><strong>≈ {plan.totalPlannedMinutes} мин</strong><span>на весь маршрут</span></div>
      <div><strong>до {budget} мин</strong><span>на одно занятие</span></div>
    </div>
    {first && <Link className="button button--primary" to={`/tasks/${first.taskId}`}>Начать первое занятие</Link>}
    <details className="learning-route__insights" open>
      <summary>Почему план устроен так</summary>
      <p className="practice-note">Учитываются успешные решения разных задач текущих версий. Три решения — правило допуска к следующей теме, а не оценка знаний.</p>
      <div className="learning-route__topics">{plan.topicInsights.map((topic) => <article key={topic.topicId}>
        <span className="practice-note">{topic.isTarget ? "Ваша цель" : "Необходимая база"}</span>
        <h3>{topic.title}</h3>
        <p>{actions[topic.nextAction] ?? "Продолжайте практику и пересчитайте маршрут"}</p>
        <dl><div><dt>Решено</dt><dd>{topic.acceptedTasks}</dd></div><div><dt>С ошибками</dt><dd>{topic.failedTasks}</dd></div><div><dt>В плане</dt><dd>{topic.plannedTasks}</dd></div></dl>
        <p className="practice-note">Сложность: {levels[topic.recommendedDifficulty] ?? "Подбирается"}. Доступных по сложности задач: {topic.eligibleTasks}.</p>
        {topic.blockedBy.length > 0 && <p>Не хватает базы: {topic.blockedBy.map((item) => item.title).join(", ")}.</p>}
        {!topic.isTarget && topic.remainingToReadiness > 0 && <p className="practice-note">До допуска к следующей теме: ещё {topic.remainingToReadiness} успешных решений разных задач.</p>}
        {topic.nextAction === "INCREASE_BUDGET" && <button className="button button--small" type="button" onClick={() => onBudget(topic.minimumMinutes)}>Выделить {topic.minimumMinutes} минут на занятие</button>}
      </article>)}</div>
    </details>
    {plan.sessions.length > 1 && <section aria-label="Следующие занятия"><h3>Дальше по маршруту</h3>
      <p className="practice-note">Это предварительный маршрут. После решений пересчитайте его: задачи и сложность могут измениться.</p>
      {plan.sessions.slice(1).map((session) => <details className="learning-route__session" key={session.number}>
        <summary>Занятие {session.number} · ≈ {session.totalMinutes} мин · {session.items.length} задач</summary>
        <ol>{session.items.map((item) => <li key={item.taskId}><Link to={`/tasks/${item.taskId}`}>{item.title}</Link><span> · ≈ {item.estimatedMinutes} мин</span></li>)}</ol>
      </details>)}
    </section>}
    {first && <h3>Первое занятие</h3>}
  </div>;
}
