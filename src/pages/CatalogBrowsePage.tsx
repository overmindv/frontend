import { useQuery } from "@apollo/client";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { COURSE_QUERY, COURSES_QUERY, PROGRAM_QUERY, PROGRAMS_QUERY, TOPIC_QUERY, TOPICS_QUERY, UNIVERSITY_QUERY, UNIVERSITIES_QUERY, type Course, type Program, type Topic, type University } from "../api/catalog";
import type * as Schema from "../api/generated";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { materialsHref } from "../api/materials";
import { Spinner } from "../components/common/Spinner";

type CatalogKind = "universities" | "programs" | "courses" | "topics";

const config = {
  universities: { title: "Университеты", description: "Учебные заведения в каталоге Overmindv", query: UNIVERSITIES_QUERY, key: "universities" },
  programs: { title: "Программы", description: "Образовательные направления и факультеты", query: PROGRAMS_QUERY, key: "programs" },
  courses: { title: "Курсы", description: "Курсы внутри образовательных программ", query: COURSES_QUERY, key: "courses" },
  topics: { title: "Темы", description: "Структура знаний и учебные темы", query: TOPICS_QUERY, key: "topics" },
} as const;

type CatalogItem = University | Program | Course | Topic;
type CatalogBrowseResult = Partial<Schema.UniversitiesQuery & Schema.ProgramsQuery & Schema.CoursesQuery & Schema.TopicsQuery>;
type CatalogDetailResult = Partial<Schema.UniversityQuery & Schema.ProgramQuery & Schema.CourseQuery & Schema.TopicQuery>;

// CatalogBrowsePage показывает публичный список сущностей с серверным поиском по названию.
export function CatalogBrowsePage({ kind }: { kind: CatalogKind }) {
  const page = config[kind];
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Дебаунс серверного поиска, чтобы не дёргать каталог на каждый символ.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [search]);

  const parentId = kind === "universities" ? null : searchParams.get("parentId");
  const variables = kind === "universities" ? { search: debouncedSearch } : { parentId, search: debouncedSearch };
  const { data, loading, error } = useQuery<CatalogBrowseResult, Schema.TopicsQueryVariables>(page.query, { variables });
  const items = data?.[page.key] ?? [];

  return <main className="page-shell public-catalog"><header className="page-heading"><div><span className="section-kicker">Каталог</span><h1>{page.title}</h1><p>{page.description}</p></div></header>{parentId && <nav className="catalog-scope" aria-label="Раздел каталога"><Link className="back-link" to={`/${parentKinds[kind]}/${encodeURIComponent(parentId)}`}>← {parentLabels[kind]}</Link><Link className="back-link" to={`/${kind}`}>Все {page.title.toLocaleLowerCase("ru")}</Link></nav>}<label className="catalog-search"><Search size={16} /><input aria-label={`Поиск: ${page.title}`} onChange={(event) => setSearch(event.target.value)} placeholder={`Найти в разделе «${page.title.toLocaleLowerCase("ru")}»`} value={search} /></label>{error && <ErrorMessage message={error.message} />}{loading && !data ? <div className="content-state"><Spinner label="Загружаем каталог…" /></div> : items.length === 0 ? <div className="content-state"><strong>{search ? "Совпадений нет" : "Раздел пока пуст"}</strong><p>{search ? "Попробуйте изменить запрос." : "Активные элементы появятся после публикации."}</p></div> : <section className="catalog-card-grid">{items.map((item) => <Link className="catalog-card" key={item.id} to={`/${kind}/${item.id}`}><div><strong>{itemTitle(item)}</strong><p>{itemDescription(item)}</p></div><ArrowRight size={16} /></Link>)}</section>}<p className="local-search-note">{parentId ? "Поиск внутри выбранного раздела." : "Поиск выполняется по всему каталогу, а не только по этой странице."}</p></main>;
}

const detailConfig = {
  universities: { back: "/universities", label: "Университет", query: UNIVERSITY_QUERY, key: "university" },
  programs: { back: "/programs", label: "Программа", query: PROGRAM_QUERY, key: "program" },
  courses: { back: "/courses", label: "Курс", query: COURSE_QUERY, key: "course" },
  topics: { back: "/topics", label: "Тема", query: TOPIC_QUERY, key: "topic" },
} as const;

// CatalogDetailPage открывает публичную страницу выбранной сущности.
export function CatalogDetailPage({ kind }: { kind: CatalogKind }) {
  const { id = "" } = useParams();
  const page = detailConfig[kind];
  const { data, loading, error } = useQuery<CatalogDetailResult, Schema.TopicQueryVariables>(page.query, { variables: { id } });
  const item = data?.[page.key];

  if (loading && !item) return <main className="page-shell content-state"><Spinner label="Открываем элемент каталога…" /></main>;
  if (error || !item) return <main className="page-shell"><ErrorMessage message={error?.message ?? "Элемент не найден"} /></main>;

  return <main className="page-shell catalog-detail"><Link className="back-link" to={page.back}>← Назад в раздел</Link><article><span className="section-kicker">{page.label}</span><h1>{itemTitle(item)}</h1><p>{itemDescription(item)}</p><CatalogRelations kind={kind} item={item} /><dl>{detailRows(item).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Не указано"}</dd></div>)}</dl>
    {kind === "topics" && <Link className="button button--ghost" to={materialsHref(item.id)}>Материалы по теме <ArrowRight size={15} aria-hidden="true" /></Link>}
  </article></main>;
}


const parentKinds = { universities: "universities", programs: "universities", courses: "programs", topics: "courses" } as const;
const parentLabels = { universities: "Университет", programs: "Университет", courses: "Программа", topics: "Курс" } as const;
const childKinds = { universities: "programs", programs: "courses", courses: "topics" } as const;

function CatalogRelations({ kind, item }: { kind: CatalogKind; item: CatalogItem }) {
  const parentId = "universityId" in item ? item.universityId : "programId" in item ? item.programId : "courseId" in item ? item.courseId : null;
  const parent = detailConfig[parentKinds[kind]];
  const { data } = useQuery<CatalogDetailResult, Schema.TopicQueryVariables>(parent.query, { variables: { id: parentId ?? "" }, skip: !parentId });
  const parentItem = data?.[parent.key];
  const child = kind === "topics" ? null : childKinds[kind];
  return <nav aria-label="Связи каталога" className="catalog-relations">
    {parentId && <p><Link to={`/${parentKinds[kind]}/${parentId}`}>{parentLabels[kind]}: {parentItem ? itemTitle(parentItem) : "Открыть"}</Link></p>}
    {child && <p><Link className="back-link" to={`/${child}?parentId=${encodeURIComponent(item.id)}`}>{config[child].title} →</Link></p>}
  </nav>;
}

function itemTitle(item: CatalogItem) { return "name" in item ? item.name : item.title; }
function itemDescription(item: CatalogItem) {
  if ("city" in item) return [item.shortName, item.city, item.country].filter(Boolean).join(" · ") || "Университет";
  if ("faculty" in item) return [item.faculty, item.degreeLevel].filter(Boolean).join(" · ") || "Образовательная программа";
  if ("title" in item) return item.description || `Сложность: ${item.difficulty}`;

  return item.description || "Курс";
}

function detailRows(item: CatalogItem): Array<[string, string]> {
  if ("city" in item) return [["Краткое название", item.shortName], ["Город", item.city], ["Страна", item.country], ["Сайт", item.websiteUrl]];
  if ("faculty" in item) return [["Краткое название", item.shortName], ["Факультет", item.faculty], ["Уровень", item.degreeLevel], ["Год начала", item.startYear?.toString() ?? ""]];
  if ("title" in item) return [["Описание", item.description], ["Сложность", item.difficulty], ["Slug", item.slug]];

  return [["Описание", item.description], ["Slug", item.slug], ["Семестр", item.semester?.toString() ?? ""], ["Год обучения", item.yearNumber?.toString() ?? ""]];
}
