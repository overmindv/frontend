import { useState, useRef } from "react";
import { ApolloError, useApolloClient, useQuery, type DocumentNode } from "@apollo/client";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SAVED_PLAN, REMOVE_PLAN_TASK, MARK_MATERIAL, SHARE_PLAN, REFRESH_PLAN, CLONE_PLAN, type SavedPlan, type MaterialStatus } from "../api/savedPlans";

export function SavedPlanPage() {
 const { id = "" } = useParams(); const auth = useAuth();
 if (auth.isLoading) return <main className="page-shell"><p>Загружаем…</p></main>;
 return <PlanDetail key={`${id}:${auth.userId ?? "guest"}`} id={id} authenticated={auth.isAuthenticated} />;
}
function PlanDetail({ id, authenticated }: { id: string; authenticated: boolean }) {
 const client = useApolloClient(); const navigate = useNavigate();
 const query = useQuery<{ savedLearningPlan: SavedPlan }>(SAVED_PLAN, { variables: { id }, fetchPolicy: "no-cache" });
 const [updated, setUpdated] = useState<SavedPlan | null>(null);
 const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [copied, setCopied] = useState(false);
 const cloneKey = useRef<string | null>(null);
 const plan = updated ?? query.data?.savedLearningPlan;
 async function change(mutation: DocumentNode, field: string, extra: Record<string, unknown> = {}) {
  if (!plan || busy) return; setBusy(true); setError(null);
  try {
   const result = await client.mutate<Record<string, SavedPlan>>({ mutation, variables: { id, revision: plan.revision, ...extra } });
   if (result.data) setUpdated(result.data[field]);
  } catch (cause) {
   const conflict = cause instanceof ApolloError && cause.graphQLErrors.some((e) => e.extensions?.code === "CONFLICT");
   setError(conflict ? "План изменён в другом окне. Обновите страницу и повторите." : "Не удалось сохранить. Ваши отметки не изменены.");
  } finally { setBusy(false); }
 }
 async function clone() {
  if (busy) return; setBusy(true); setError(null); cloneKey.current ??= crypto.randomUUID();
  try {
   const result = await client.mutate<{ cloneLearningPlan: { id: string } }>({ mutation: CLONE_PLAN, variables: { id, requestId: cloneKey.current } });
   if (result.data) navigate(`/plans/${result.data.cloneLearningPlan.id}`);
  } catch { setError("Не удалось скопировать план. Возможно, доступ к нему закрыт."); }
  finally { setBusy(false); }
 }
 if (query.loading && !plan) return <main className="page-shell"><p role="status">Загружаем план…</p></main>;
 if (!plan || query.error) return <main className="page-shell"><h1>План недоступен</h1><p>Возможно, он приватный или ссылка устарела.</p><Link to="/plans">Мои планы</Link></main>;
 const materialDone = plan.materials.filter((m) => m.status === "DONE").length;
 const taskDone = plan.tasks.filter((t) => t.completed).length;
 const total = plan.materials.length + plan.tasks.length;
 const completed = materialDone + taskDone;
 const percent = total ? Math.round(completed / total * 100) : 0;
 return <main className="page-shell saved-plan-detail">
  <Link to="/plans">← Мои планы</Link>
  <header className="saved-plan-heading"><div><span className="practice-note">{plan.public ? "Публичный план" : "Приватный план"}</span><h1>{plan.goal}</h1></div>
   {!plan.isOwner && (authenticated ? <button className="button button--primary" disabled={busy} onClick={() => void clone()}>Скопировать себе</button> : <Link className="button" to="/login" state={{ from: { pathname: `/plans/${id}` } }}>Войти и скопировать</Link>)}
  </header>
  {error && <p className="message message--error" role="alert">{error}</p>}
  {plan.isOwner && <>
   <section className="plan-progress" aria-label="Прогресс плана">
    <div className="plan-progress__summary"><strong>{plan.progressAvailable ? `${percent}%` : `${materialDone} / ${plan.materials.length}`}</strong><span>{plan.progressAvailable ? `${completed} из ${total} пунктов выполнено` : "материалов завершено"}</span></div>
    <progress aria-label={plan.progressAvailable ? "Выполнено пунктов" : "Завершено материалов"} max={plan.progressAvailable ? Math.max(total, 1) : Math.max(plan.materials.length, 1)} value={plan.progressAvailable ? completed : materialDone} />
    <p>Материалы: {materialDone}/{plan.materials.length} · Задачи: {plan.progressAvailable ? `${taskDone}/${plan.tasks.length}` : "не удалось проверить"}</p>
    <small>Материалы — по вашим отметкам. Задачи — по успешным решениям; другая версия отмечена отдельно.</small>
   </section>
   <div className="saved-plan-actions">
    <button className="button" disabled={busy} onClick={() => void change(REFRESH_PLAN, "refreshLearningPlan")}>{busy ? "Сохраняем…" : "Обновить план"}</button>
    <label><input type="checkbox" checked={plan.public} disabled={busy} onChange={(e) => void change(SHARE_PLAN, "setLearningPlanPublic", { public: e.target.checked })} /> Публичный по ссылке</label>
    {plan.public && <button className="button" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/plans/${plan.id}`).then(() => setCopied(true)).catch(() => setError("Не удалось скопировать ссылку.")); }}>{copied ? "Ссылка скопирована" : "Скопировать ссылку"}</button>}
   </div>
   <p className="practice-note">Обновление добавит новые шаги и сохранит отметки. По публичной ссылке видны цель и содержание, но не ваш прогресс.</p>
  </>}
  {!plan.isOwner && <p className="practice-note">Копия будет приватной. Отметки автора не переносятся; ваши решённые задачи учитываются отдельно.</p>}
  <section><h2>Материалы <span className="practice-note">{plan.materials.length}</span></h2>
   <ul className="plan-steps">{plan.materials.map((m) => <li key={m.id} className={plan.isOwner && m.status === "DONE" ? "plan-step--done" : ""}>
    <div><a href={m.url} target="_blank" rel="noopener noreferrer">{m.title}</a><span className="practice-note"> · ≈ {m.minutes} мин</span><p>{m.action}</p></div>
    {plan.isOwner && <select aria-label={`Статус: ${m.title}`} disabled={busy} value={m.status} onChange={(e) => void change(MARK_MATERIAL, "updateLearningMaterial", { materialId: m.id, status: e.target.value as MaterialStatus })}>
     <option value="TODO">Не начато</option><option value="IN_PROGRESS">Изучаю</option><option value="DONE">Готово</option>
    </select>}
   </li>)}</ul>
  </section>
  <section><h2>Практика <span className="practice-note">{plan.tasks.length}</span></h2>
   {plan.isOwner && <p className="practice-note">Недоступную или ненужную задачу можно убрать. Это не засчитывается как решение.</p>}
   {plan.tasks.length === 0 && <p>Задач пока нет. Обновите план, когда каталог пополнится.</p>}
   <ul className="plan-steps">{plan.tasks.map((task) => <li key={`${task.id}:${task.versionId}`}><div><Link to={`/tasks/${task.id}`}>{task.title}</Link><span className="practice-note"> · ≈ {task.minutes} мин</span></div>{plan.isOwner && <span>{plan.progressAvailable ? (task.completed ? (task.completionVersionId && task.completionVersionId !== task.versionId ? "Решено в другой версии" : "Решено") : "Осталось решить") : "Не проверено"}</span>}{plan.isOwner && !task.completed && <button className="button button--small" disabled={busy} aria-label={`Убрать: ${task.title}`} onClick={() => void change(REMOVE_PLAN_TASK, "removeLearningPlanTask", { taskId: task.id })}>Убрать</button>}</li>)}</ul>
  </section>
 </main>;
}
