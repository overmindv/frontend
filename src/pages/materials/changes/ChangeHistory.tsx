import { useQuery } from "@apollo/client";
import { GitCommitHorizontal } from "lucide-react";
import { useState } from "react";
import { MATERIAL_CHANGE_HISTORY_QUERY, type MaterialChangeHistoryPage } from "../../../api/materialChanges";
import { isMaterialID, materialDate } from "../../../api/materials";
import { Spinner } from "../../../components/common/Spinner";

export function ChangeHistory({ id, select }: { id: string; select: (id: string, ordinal: number) => void }) {
  const [before, setBefore] = useState<number | null>(null);
  const query = useQuery<{ materialChangeHistory: MaterialChangeHistoryPage | null }>(MATERIAL_CHANGE_HISTORY_QUERY, {
    variables: { id, before }, fetchPolicy: "no-cache",
  });
  const page = query.data?.materialChangeHistory;
  if (query.loading) return <Spinner label="Загружаем историю" />;
  if (query.error || !page) return <div className="change-empty">
    <p role="alert">Не удалось загрузить историю.</p>
    <button type="button" className="button button--ghost" onClick={() => void query.refetch().catch(() => undefined)}>Повторить</button>
  </div>;
  const items = page.items.filter((item) => isMaterialID(item.id));
  return <section aria-label="История предложения">
    {items.length === 0 ? <p className="change-empty">Нет версий</p> : <ul className="change-history">
      {items.map((item) => <li key={item.id}>
        <div>
          <strong>Версия {item.ordinal}</strong>
          {item.message && <p>{item.message}</p>}
        </div>
        <time dateTime={item.createdAt}>{materialDate(item.createdAt)}</time>
        <button type="button" className="button button--ghost" aria-label={`Сравнить версию ${item.ordinal}`} onClick={() => select(item.id, item.ordinal)}>
          <GitCommitHorizontal size={16} aria-hidden="true" /> Сравнить
        </button>
      </li>)}
    </ul>}
    {(before !== null || page.nextBeforeOrdinal) && <nav className="change-pagination" aria-label="Страницы истории">
      {before !== null && <button type="button" className="button button--ghost" onClick={() => setBefore(null)}>К новым версиям</button>}
      {page.nextBeforeOrdinal !== null && page.nextBeforeOrdinal > 0 && <button type="button" className="button button--ghost"
        onClick={() => setBefore(page.nextBeforeOrdinal)}>Старые версии</button>}
    </nav>}
  </section>;
}
