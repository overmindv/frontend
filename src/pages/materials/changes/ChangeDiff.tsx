import { useQuery } from "@apollo/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { MATERIAL_CHANGE_DIFF_QUERY, type MaterialChangeDiff } from "../../../api/materialChanges";
import { Spinner } from "../../../components/common/Spinner";

const rowsPerPage = 250;

function getRows(value: string) {
  const lines = value.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines.map((text, index) => ({
    text,
    kind: (index === 0 && text.startsWith("--- ")) || (index === 1 && text.startsWith("+++ ")) || text.startsWith("@@ ") ?
      "header" : text.startsWith("+") ? "addition" : text.startsWith("-") ? "deletion" : "context",
  }));
}

export function ChangeDiff({ id, revisionId }: { id: string; revisionId: string }) {
  const [page, setPage] = useState(0);
  const query = useQuery<{ materialChangeDiff: MaterialChangeDiff | null }>(MATERIAL_CHANGE_DIFF_QUERY, {
    variables: { id, revisionId }, fetchPolicy: "no-cache",
  });
  const diff = query.data?.materialChangeDiff;
  const valid = diff?.revisionId === revisionId;
  const rows = useMemo(() => getRows(valid ? diff.unifiedDiff : ""), [diff, valid]);
  const pages = Math.ceil(rows.length / rowsPerPage);
  if (query.loading) return <Spinner label="Сравниваем версии" />;
  if (query.error || !valid) return <div className="change-empty">
    <p role="alert">Не удалось открыть сравнение.</p>
    <button type="button" className="button button--ghost" onClick={() => void query.refetch().catch(() => undefined)}>Повторить</button>
  </div>;
  return <section aria-label="Сравнение версий" className="change-diff">
    {diff.truncated && <p role="status">Сравнение неполное: превышен лимит diff.</p>}
    {rows.length ? <div className="change-patch" role="region" aria-label="Строки изменений" tabIndex={0}>
      <code>{rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(({ text, kind }, index) =>
        <span key={index} className={`change-line change-line--${kind}`}>{text}{"\n"}</span>)}</code>
    </div> : !diff.truncated && <p className="change-empty">Нет изменений в тексте</p>}
    {pages > 1 && <nav className="change-pagination" aria-label="Страницы сравнения">
      <button type="button" className="button button--ghost" title="Предыдущая страница" aria-label="Предыдущая страница"
        disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
      <span>{page + 1}/{pages}</span>
      <button type="button" className="button button--ghost" title="Следующая страница" aria-label="Следующая страница"
        disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
    </nav>}
  </section>;
}
