import { useQuery } from "@apollo/client";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useState } from "react";
import { MATERIAL_TOPIC_LABEL, MATERIAL_TOPIC_SEARCH, type DraftTopic } from "../../../api/materialDrafts";
import { isMaterialID } from "../../../api/materials";

const pageSize = 20;
const topicLimit = 8;

function SelectedTopic({ id, title, remove }: { id: string; title?: string; remove: () => void }) {
  const details = useQuery<{ topic: DraftTopic | null }>(MATERIAL_TOPIC_LABEL, {
    variables: { id }, skip: Boolean(title) || !isMaterialID(id),
  });
  const label = title ?? details.data?.topic?.title ?? `Тема ${id.slice(-8)}`;
  return <li>
    <span>{label}</span>
    <button type="button" className="button button--ghost editor-icon" aria-label={`Убрать тему: ${label}`} title="Убрать тему" onClick={remove}>
      <X size={16} aria-hidden="true" />
    </button>
  </li>;
}

export function DraftTopics({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const query = useQuery<{ topics: DraftTopic[] }>(MATERIAL_TOPIC_SEARCH, {
    variables: { search, offset }, skip: !open, fetchPolicy: "no-cache",
  });
  const results = query.data?.topics ?? [];

  function searchTopics() {
    setSearch(term.trim());
    setOffset(0);
  }

  function add(topic: DraftTopic) {
    if (ids.length >= topicLimit || ids.includes(topic.id) || !isMaterialID(topic.id)) return;
    setTitles((current) => ({ ...current, [topic.id]: topic.title }));
    onChange([...ids, topic.id]);
  }

  return <section className="editor-topics" aria-labelledby="draft-topics-heading">
    <div className="editor-section-heading">
      <h2 id="draft-topics-heading">Темы</h2>
      <span>{ids.length}/{topicLimit}</span>
    </div>
    {ids.length > 0 && <ul className="editor-topic-tags">
      {ids.map((id) => <SelectedTopic key={id} id={id} title={titles[id]} remove={() => onChange(ids.filter((item) => item !== id))} />)}
    </ul>}
    <button type="button" className="button button--ghost" aria-expanded={open}
      onClick={() => setOpen(!open)} disabled={!open && ids.length >= topicLimit}>
      {open ? "Закрыть поиск" : "Добавить тему"}
    </button>
    {open && <div className="editor-topic-picker">
      <div className="editor-topic-search">
        <input type="search" aria-label="Поиск тем" maxLength={100} value={term} onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); searchTopics(); } }} />
        <button type="button" className="button button--ghost editor-icon" aria-label="Найти темы" title="Найти темы" onClick={searchTopics}>
          <Search size={17} aria-hidden="true" />
        </button>
      </div>
      {query.loading ? <p role="status">Ищем темы</p> : query.error ?
        <button type="button" className="button button--ghost" onClick={() => void query.refetch().catch(() => undefined)}>Повторить поиск</button> :
        results.length === 0 ? <p>Темы не найдены</p> :
          <ul className="editor-topic-results">{results.map((topic) => <li key={topic.id}>
            <button type="button" className="button button--ghost" onClick={() => add(topic)}
              disabled={ids.length >= topicLimit || ids.includes(topic.id)}>{topic.title}</button>
          </li>)}</ul>}
      {(offset > 0 || results.length === pageSize) && <div className="editor-topic-search">
        <button type="button" className="button button--ghost editor-icon" aria-label="Предыдущая страница тем"
          title="Предыдущая страница тем" disabled={!offset || query.loading}
          onClick={() => setOffset(offset - pageSize)}><ChevronLeft size={17} aria-hidden="true" /></button>
        <button type="button" className="button button--ghost editor-icon" aria-label="Следующая страница тем"
          title="Следующая страница тем" disabled={results.length < pageSize || query.loading}
          onClick={() => setOffset(offset + pageSize)}><ChevronRight size={17} aria-hidden="true" /></button>
      </div>}
    </div>}
  </section>;
}
