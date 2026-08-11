import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  APPROVE_TASK_CANDIDATE,
  COLLECTION_JOB_QUERY,
  COLLECTION_JOBS_QUERY,
  COLLECTION_SOURCES_QUERY,
  REJECT_TASK_CANDIDATE,
  START_COLLECTION,
  TASK_CANDIDATE_QUERY,
  TASK_CANDIDATES_QUERY,
  UPDATE_TASK_CANDIDATE,
  type TaskCandidate,
  type TaskCandidateList,
  type TaskCandidateReviewInput,
  type TaskCandidateStatus,
  type TaskCollectionJob,
} from "../../api/collection";
import { IT_TASK_TOPICS_QUERY, type ITTaskDifficulty, type ITTaskExample } from "../../api/tasks";
import type { Topic } from "../../api/catalog";
import { getErrorMessage } from "../../api/errors";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Spinner } from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";

const pageSize = 20;

// CollectedTasksPage объединяет ручной запуск, журнал job и очередь модерации.
export function CollectedTasksPage() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedJobID = searchParams.get("job") ?? "";
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<TaskCandidateStatus | "">("pending");
  const [sourceId, setSourceId] = useState("");
  const sources = useQuery<{ taskCollectionSources: { telegramChannels: string[]; websiteSources: string[] } }>(COLLECTION_SOURCES_QUERY, { skip: !isAdmin });
  const candidates = useQuery<{ taskCandidates: TaskCandidateList }>(TASK_CANDIDATES_QUERY, {
    variables: { filter: { ...(status ? { status } : {}), ...(sourceId ? { sourceId } : {}) }, pagination: { limit: pageSize, offset } },
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
  });
  const jobs = useQuery<{ taskCollectionJobs: { items: TaskCollectionJob[] } }>(COLLECTION_JOBS_QUERY, {
    variables: { unreadOnly: false, pagination: { limit: 10, offset: 0 } },
    skip: !isAdmin,
    pollInterval: 5000,
  });
  const selectedJob = useQuery<{ taskCollectionJob: TaskCollectionJob }>(COLLECTION_JOB_QUERY, {
    variables: { id: selectedJobID },
    skip: !isAdmin || !selectedJobID,
    pollInterval: 5000,
  });
  const [start, startState] = useMutation(START_COLLECTION);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [publishedFrom, setPublishedFrom] = useState(() => localDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [publishedTo, setPublishedTo] = useState(() => localDateTime(new Date()));
  const [urls, setURLs] = useState("");
  const [limit, setLimit] = useState(100);

  if (!isAdmin) return <Denied />;

  const submitCollection = async (event: FormEvent) => {
    event.preventDefault();
    const websiteUrls = urls.split("\n").map((value) => value.trim()).filter(Boolean);
    await start({ variables: { input: {
      idempotencyKey: crypto.randomUUID(), telegramChannels: selectedChannels,
      ...(selectedChannels.length ? { publishedFrom: new Date(publishedFrom).toISOString(), publishedTo: new Date(publishedTo).toISOString() } : {}),
      websiteUrls, maxItemsPerSource: limit,
    } } });
    await jobs.refetch();
  };
  const items = candidates.data?.taskCandidates.items ?? [];

  return <main className="page-shell catalog collected-page">
    <header className="section-heading"><div><span className="eyebrow">Task hunter</span><h1>Собранные задачи</h1></div><p>Запускайте сбор и публикуйте только проверенные кандидаты.</p></header>
    <section className="panel">
      <h2>Новый сбор</h2>
      <form className="entity-form" onSubmit={(event) => void submitCollection(event)}>
        <fieldset className="field"><legend>Telegram-каналы</legend><div className="tag-list">{sources.data?.taskCollectionSources.telegramChannels.map((channel) => <label className="status-tag" key={channel}><input checked={selectedChannels.includes(channel)} onChange={(event) => setSelectedChannels((current) => event.target.checked ? [...current, channel] : current.filter((item) => item !== channel))} type="checkbox" /> @{channel}</label>)}</div></fieldset>
        <div className="inline-form"><label className="field"><span>С даты</span><input disabled={!selectedChannels.length} type="datetime-local" value={publishedFrom} onChange={(event) => setPublishedFrom(event.target.value)} /></label><label className="field"><span>До даты</span><input disabled={!selectedChannels.length} type="datetime-local" value={publishedTo} onChange={(event) => setPublishedTo(event.target.value)} /></label><label className="field"><span>Лимит на источник</span><input min={1} max={500} type="number" value={limit} onChange={(event) => setLimit(Number(event.target.value))} /></label></div>
        <label className="field"><span>Прямые HTTPS-ссылки Codeforces, LeetCode или CodeRun — по одной в строке</span><textarea rows={4} value={urls} onChange={(event) => setURLs(event.target.value)} /></label>
        {startState.error && <ErrorMessage message={getErrorMessage(startState.error)} />}
        <button className="button button--primary" disabled={startState.loading || (!selectedChannels.length && !urls.trim())}>{startState.loading ? "Ставим в очередь…" : "Собрать задачи"}</button>
      </form>
    </section>
    <section className="panel"><h2>Последние запуски</h2>{jobs.error && <ErrorMessage message={getErrorMessage(jobs.error)} />}<div className="catalog-list">{jobs.data?.taskCollectionJobs.items.map((job) => <article className="catalog-row" key={job.id}><div><strong>{job.trigger === "manual" ? "Ручной сбор" : "Плановый сбор"}</strong><p>{formatDate(job.createdAt)} · {job.status}</p></div><span>{job.importedTotal} новых · {job.duplicatesTotal} дублей · {job.errorCount} ошибок</span><Link className="text-link" to={`/admin/collected-tasks?job=${job.id}`}>Детали</Link></article>)}</div></section>
    {selectedJobID && <section className="panel"><h2>Детали запуска</h2>{selectedJob.error && <ErrorMessage message={getErrorMessage(selectedJob.error)} />}{selectedJob.loading && !selectedJob.data ? <Spinner label="Загружаем источники…" /> : <div className="catalog-list">{selectedJob.data?.taskCollectionJob.sources?.map((source) => <article className="catalog-row" key={source.id}><div><strong>{source.sourceId}</strong><p>{source.url || source.kind} · {source.status}</p>{source.errorMessage && <p>{source.errorMessage}</p>}</div><span>{source.collectedTotal} собрано · {source.importedTotal} новых · {source.duplicatesTotal} дублей · {source.invalidTotal} невалидных</span></article>)}</div>}</section>}
    <section className="panel">
      <div className="section-heading"><div><h2>Очередь модерации</h2></div><div className="inline-form"><label className="field"><span>Статус</span><select value={status} onChange={(event) => { setStatus(event.target.value as TaskCandidateStatus | ""); setOffset(0); }}><option value="">Все</option><option value="pending">Ожидают</option><option value="approved">Одобрены</option><option value="rejected">Отклонены</option></select></label><label className="field"><span>Источник</span><select value={sourceId} onChange={(event) => { setSourceId(event.target.value); setOffset(0); }}><option value="">Все</option><option value="codeforces">Codeforces</option><option value="leetcode">LeetCode</option><option value="coderun">CodeRun</option>{sources.data?.taskCollectionSources.telegramChannels.map((channel) => <option key={channel} value={`telegram:${channel}`}>@{channel}</option>)}</select></label></div></div>
      {candidates.error && <ErrorMessage message={getErrorMessage(candidates.error)} />}
      {candidates.loading && !candidates.data ? <Spinner label="Загружаем кандидатов…" /> : <div className="catalog-list">{items.map((candidate) => <article className="catalog-row" key={candidate.id}><div><strong>{candidate.title}</strong><p>{candidate.sourceName || candidate.sourceId} · revision {candidate.revision}</p></div><span className="status-tag">{candidate.status}</span><Link className="button button--ghost" to={`/admin/collected-tasks/${candidate.id}`}>Открыть</Link></article>)}</div>}
      <nav className="pagination"><button className="button button--ghost" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - pageSize))}>← Назад</button><span>Страница {Math.floor(offset / pageSize) + 1}</span><button className="button button--ghost" disabled={items.length < pageSize} onClick={() => setOffset(offset + pageSize)}>Дальше →</button></nav>
    </section>
  </main>;
}

// CandidateEditorPage редактирует pending-кандидата и передаёт полную revision на approve.
export function CandidateEditorPage() {
  const { isAdmin } = useAuth();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const candidateQuery = useQuery<{ taskCandidate: TaskCandidate }>(TASK_CANDIDATE_QUERY, { variables: { id }, skip: !isAdmin });
  const topics = useQuery<{ topics: Topic[] }>(IT_TASK_TOPICS_QUERY, { skip: !isAdmin });
  const [update, updateState] = useMutation(UPDATE_TASK_CANDIDATE);
  const [approve, approveState] = useMutation(APPROVE_TASK_CANDIDATE);
  const [reject, rejectState] = useMutation(REJECT_TASK_CANDIDATE);
  const [form, setForm] = useState<TaskCandidateReviewInput | null>(null);
  const candidate = candidateQuery.data?.taskCandidate;

  useEffect(() => {
    if (!candidate) return;
    setForm({ expectedRevision: candidate.revision, topicId: candidate.topicId, title: candidate.title, statement: candidate.statement, difficulty: candidate.difficulty, tags: candidate.tags, examples: candidate.examples, constraints: candidate.constraints });
  }, [candidate]);

  if (!isAdmin) return <Denied />;
  if (candidateQuery.loading && !candidate) return <main className="page-shell panel"><Spinner label="Открываем кандидата…" /></main>;
  if (candidateQuery.error || !candidate || !form) return <main className="page-shell panel"><ErrorMessage message={getErrorMessage(candidateQuery.error)} /></main>;

  const mutationError = updateState.error ?? approveState.error ?? rejectState.error;
  const save = async () => { const result = await update({ variables: { id, input: form } }); if (result.data?.updateTaskCandidate) setForm({ ...form, expectedRevision: result.data.updateTaskCandidate.revision }); await candidateQuery.refetch(); };
  const publish = async () => { await approve({ variables: { id, input: form } }); navigate("/admin/collected-tasks"); };
  const rejectCandidate = async () => { await reject({ variables: { id, expectedRevision: form.expectedRevision, reason: "Отклонено администратором" } }); navigate("/admin/collected-tasks"); };

  return <main className="page-shell catalog"><Link className="back-link" to="/admin/collected-tasks">← К очереди</Link><section className="panel"><header className="section-heading"><div><span className="eyebrow">{candidate.sourceName || candidate.sourceId}</span><h1>Редактор кандидата</h1></div><span className="status-tag">{candidate.status} · rev {candidate.revision}</span></header><p><a href={candidate.sourceUrl} target="_blank" rel="noreferrer">Оригинал ↗</a> · provenance не изменяется</p>
    <div className="entity-form"><label className="field"><span>Тема</span><select value={form.topicId ?? ""} onChange={(event) => setForm({ ...form, topicId: event.target.value || null })}><option value="">Без темы</option>{topics.data?.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label><label className="field"><span>Название</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label className="field"><span>Условие</span><textarea rows={14} value={form.statement} onChange={(event) => setForm({ ...form, statement: event.target.value })} /></label><label className="field"><span>Сложность</span><select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value as ITTaskDifficulty })}><option value="easy">Начальная</option><option value="medium">Средняя</option><option value="hard">Сложная</option></select></label><label className="field"><span>Теги через запятую</span><input value={form.tags.join(", ")} onChange={(event) => setForm({ ...form, tags: splitCSV(event.target.value) })} /></label><label className="field"><span>Ограничения — по одному в строке</span><textarea rows={4} value={form.constraints.join("\n")} onChange={(event) => setForm({ ...form, constraints: splitLines(event.target.value) })} /></label><ExamplesEditor examples={form.examples} onChange={(examples) => setForm({ ...form, examples })} />
      {mutationError && <><ErrorMessage message={`${getErrorMessage(mutationError)} Возможно, revision устарела.`} /><button className="button button--ghost" onClick={() => void candidateQuery.refetch()}>Загрузить актуальную revision</button></>}
      <div className="inline-form"><button className="button" disabled={candidate.status !== "pending" || updateState.loading} onClick={() => void save()}>Сохранить</button><button className="button button--primary" disabled={candidate.status !== "pending" || approveState.loading} onClick={() => void publish()}>Одобрить и опубликовать</button><button className="button button--ghost" disabled={candidate.status !== "pending" || rejectState.loading} onClick={() => void rejectCandidate()}>Отклонить</button></div>
    </div></section></main>;
}

function ExamplesEditor({ examples, onChange }: { examples: ITTaskExample[]; onChange: (items: ITTaskExample[]) => void }) {
  const change = (index: number, field: keyof ITTaskExample, value: string) => onChange(examples.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  return <fieldset className="field"><legend>Примеры</legend>{examples.map((example, index) => <div className="inline-form" key={index}><input aria-label={`Ввод ${index + 1}`} placeholder="Input" value={example.input} onChange={(event) => change(index, "input", event.target.value)} /><input aria-label={`Вывод ${index + 1}`} placeholder="Output" value={example.output} onChange={(event) => change(index, "output", event.target.value)} /><button className="button button--ghost" type="button" onClick={() => onChange(examples.filter((_, itemIndex) => itemIndex !== index))}>Удалить</button></div>)}<button className="button button--ghost" type="button" onClick={() => onChange([...examples, { input: "", output: "", explanation: "" }])}>+ Пример</button></fieldset>;
}

function Denied() { return <main className="page-shell panel"><h1>Недостаточно прав</h1><p>Раздел доступен администраторам.</p></main>; }
function splitCSV(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function splitLines(value: string) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }
function localDateTime(value: Date) { const offset = value.getTimezoneOffset() * 60000; return new Date(value.getTime() - offset).toISOString().slice(0, 16); }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
