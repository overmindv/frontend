import { useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import { MY_PLANS, type SavedPlan } from "../api/savedPlans";
import { ErrorMessage } from "../components/common/ErrorMessage";

export function SavedPlansPage() {
 const { data, loading, error, refetch } = useQuery<{ myLearningPlans: SavedPlan[] }>(MY_PLANS, { fetchPolicy: "no-cache" });
 return <main className="page-shell saved-plans">
  <header className="saved-plan-heading"><div><h1>Мои планы</h1><p>Продолжите с того места, где остановились.</p></div><Link className="button button--primary" to="/practice">Новый план</Link></header>
  {loading && <p role="status">Загружаем планы…</p>}
  {error && <><ErrorMessage message="Не удалось загрузить планы." /><button className="button" onClick={() => void refetch()}>Повторить</button></>}
  {data?.myLearningPlans.length === 0 && <p>Пока нет сохранённых планов. Начните с цели.</p>}
  <div className="saved-plan-grid">{data?.myLearningPlans.map((plan) => {
   const done = plan.materials.filter((m) => m.status === "DONE").length;
   return <Link className="saved-plan-card" key={plan.id} to={`/plans/${plan.id}`}>
    <span className="practice-note">{plan.public ? "Публичный" : "Приватный"}</span>
    <h2>{plan.goal}</h2><p>Материалы: {done} из {plan.materials.length} · Задач: {plan.tasks.length}</p>
   </Link>;
  })}</div>
 </main>;
}
