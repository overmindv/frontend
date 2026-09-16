import { useQuery } from "@apollo/client";
import { ArrowRight, BookOpen, Building2, ClipboardList, GraduationCap, Search, Tags } from "lucide-react";
import type { ComponentType } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SEARCH_QUERY, SEARCH_KINDS, kindDescription, kindHref, kindTitle, totalResults, type SearchKindKey, type SearchResults } from "../api/search";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";

const kindIcons: Record<SearchKindKey, ComponentType<{ size?: number }>> = {
  universities: Building2,
  programs: GraduationCap,
  courses: BookOpen,
  topics: Tags,
  tasks: ClipboardList,
};

// SearchPage показывает результаты глобального поиска, сгруппированные и подписанные по виду.
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const { data, loading, error } = useQuery<{ search: SearchResults }>(SEARCH_QUERY, {
    variables: { query, limit: 20 },
    skip: !query.trim(),
  });
  const results = data?.search;

  if (!query.trim()) {
    return (
      <main className="page-shell">
        <div className="content-state">
          <Search size={28} />
          <strong>Поиск по всей платформе</strong>
          <p>Начните вводить запрос, чтобы найти вуз, программу, курс, тему или задачу.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell">
        <ErrorMessage message={error.message} />
      </main>
    );
  }

  if (loading && !results) {
    return (
      <main className="page-shell">
        <div className="content-state">
          <Spinner label="Ищем…" />
        </div>
      </main>
    );
  }

  const total = results ? totalResults(results) : 0;

  return (
    <main className="page-shell search-page">
      <header className="page-heading">
        <div>
          <span className="section-kicker">Поиск</span>
          <h1>Результаты по запросу «{query}»</h1>
          <p>{loading ? "Ищем…" : total === 0 ? "Совпадений не найдено. Попробуйте изменить запрос." : `Найдено вариантов: ${total}`}</p>
        </div>
        <Search size={28} />
      </header>
      {results && total > 0 && (
        <div className="search-groups">
          {SEARCH_KINDS.map((kind) => {
            const items = results[kind.key];
            if (items.length === 0) return null;
            const Icon = kindIcons[kind.key];
            return (
              <section className="search-group" key={kind.key}>
                <h2 className="search-group__title"><Icon size={18} /> {kind.label} <span>{items.length}</span></h2>
                <ul className="search-group__list">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link className="search-group__item" to={`${kindHref(kind.key)}/${item.id}`}>
                        <Icon size={17} />
                        <span><strong>{kindTitle(item)}</strong><small>{kind.singular} · {kindDescription(item)}</small></span>
                        <ArrowRight size={16} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
