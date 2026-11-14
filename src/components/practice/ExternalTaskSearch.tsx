import { useRef, useState, type FormEvent } from "react";
import { gql, useApolloClient } from "@apollo/client";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../../api/errors";
import { ErrorMessage } from "../common/ErrorMessage";

export const EXTERNAL_TASK_SEARCH = gql`query ExternalTaskSearch($query: String!) { externalTaskSearch(query: $query) { title url rating tags } }`;
export const IMPORT_EXTERNAL_TASK = gql`mutation ImportExternalTask($input: StartTaskCollectionInput!) { startTaskCollection(input: $input) { id status } }`;
interface Result { title: string; url: string; rating: number; tags: string[] }
export function ExternalTaskSearch() {
  const client = useApolloClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState<string | null>(null);
  const request = useRef(0);
  const keys = useRef<Record<string, string>>({});
  async function search(event: FormEvent) {
    event.preventDefault(); if (!query.trim() || busy) return;
    const current = ++request.current; setBusy(true); setError(null); setResults(null);
    try {
      const response = await client.query<{ externalTaskSearch: Result[] }>({ query: EXTERNAL_TASK_SEARCH, variables: { query: query.trim() }, fetchPolicy: "no-cache" });
      if (current === request.current) setResults(response.data.externalTaskSearch);
    } catch (cause) { if (current === request.current) setError(getErrorMessage(cause)); }
    finally { if (current === request.current) setBusy(false); }
  }
  async function enqueue(url: string) {
    if (importing || jobs[url]) return;
    setImporting(url); setError(null);
    keys.current[url] ??= crypto.randomUUID();
    try {
      const response = await client.mutate<{ startTaskCollection: { id: string } }>({ mutation: IMPORT_EXTERNAL_TASK, variables: { input: { idempotencyKey: keys.current[url], websiteUrls: [url], telegramChannels: [], maxItemsPerSource: 1 } } });
      if (response.data) setJobs((previous) => ({ ...previous, [url]: response.data!.startTaskCollection.id }));
    } catch (cause) { setError(getErrorMessage(cause)); }
    finally { setImporting(null); }
  }
  return <section className="practice-form" aria-label="Поиск задач в интернете">
    <h2>Найти задачи в Codeforces</h2>
    <p>Бесплатный поиск по названию и тегам: например, graphs, strings, binary search. Источник содержит алгоритмические задачи, а не полный каталог ML.</p>
    <form onSubmit={(event) => void search(event)}>
      <label>Название или тег задачи <input maxLength={100} required value={query} onChange={(event) => { request.current++; setQuery(event.target.value); setResults(null); setError(null); setBusy(false); }} /></label>
      <button className="button" disabled={busy || !query.trim()}>{busy ? "Ищем…" : "Найти во внешнем каталоге"}</button>
    </form>
    {error && <ErrorMessage message={error} />}
    {results?.length === 0 && <p role="status">Ничего не найдено. Попробуйте другой тег или название.</p>}
    <ul>{results?.map((item) => <li key={item.url}>
      <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a> · {item.rating || "Без рейтинга"} · {item.tags.join(", ")}
      {jobs[item.url] ? <Link to={`/admin/collected-tasks?job=${jobs[item.url]}`}>Открыть импорт</Link> : <button className="button button--small" type="button" disabled={importing !== null} onClick={() => void enqueue(item.url)}>Добавить в очередь модерации</button>}
    </li>)}</ul>
    <p className="practice-note">Импорт сохраняет источник. Перед публикацией проверьте условие, тему и тесты в существующей очереди модерации.</p>
  </section>;
}
