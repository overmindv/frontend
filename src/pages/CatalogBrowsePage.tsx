import { useQuery } from "@apollo/client";
import { ArrowRight, BookOpen, Building2, GraduationCap, Search, Tags } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { COURSE_QUERY, COURSES_QUERY, PROGRAM_QUERY, PROGRAMS_QUERY, TOPIC_QUERY, TOPICS_QUERY, UNIVERSITY_QUERY, UNIVERSITIES_QUERY, type Course, type Program, type Topic, type University } from "../api/catalog";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Spinner } from "../components/common/Spinner";

type CatalogKind = "universities" | "programs" | "courses" | "topics";

const config = {
  universities: { title: "Университеты", description: "Учебные заведения в каталоге Overmindv", query: UNIVERSITIES_QUERY, key: "universities", icon: Building2 },
  programs: { title: "Программы", description: "Образовательные направления и факультеты", query: PROGRAMS_QUERY, key: "programs", icon: GraduationCap },
  courses: { title: "Курсы", description: "Курсы внутри образовательных программ", query: COURSES_QUERY, key: "courses", icon: BookOpen },
  topics: { title: "Темы", description: "Структура знаний и учебные темы", query: TOPICS_QUERY, key: "topics", icon: Tags },
} as const;

type CatalogItem = University | Program | Course | Topic;

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

  const variables = kind === "universities" ? { search: debouncedSearch } : { parentId: null, search: debouncedSearch };
  const { data, loading, error } = useQuery<Record<string, CatalogItem[]>>(page.query, { variables });
  const items = data?.[page.key] ?? [];
  const Icon = page.icon;

  return <main className="page-shell public-catalog"><header className="page-heading"><div><span className="section-kicker">Каталог</span><h1>{page.title}</h1><p>{page.description}</p></div><Icon size={28} /></header><label className="catalog-search"><Search size={18} /><input aria-label={`Поиск: ${page.title}`} onChange={(event) => setSearch(event.target.value)} placeholder={`Найти в разделе «${page.title.toLocaleLowerCase("ru")}»`} value={search} /></label>{error && <ErrorMessage message={error.message} />}{loading && !data ? <div className="content-state"><Spinner label="Загружаем каталог…" /></div> : items.length === 0 ? <div className="content-state"><Icon size={28} /><strong>{search ? "Совпадений нет" : "Раздел пока пуст"}</strong><p>{search ? "Попробуйте изменить запрос." : "Активные элементы появятся после публикации."}</p></div> : <section className="catalog-card-grid">{items.map((item) => <Link className="catalog-card" key={item.id} to={`/${kind}/${item.id}`}><div className="catalog-card__icon"><Icon size={19} /></div><div><strong>{itemTitle(item)}</strong><p>{itemDescription(item)}</p></div><ArrowRight size={17} /></Link>)}</section>}<p className="local-search-note">Поиск выполняется по всему каталогу, а не только по этой странице.</p></main>;
}

const detailConfig = {
  universities: { back: "/universities", label: "Университет", query: UNIVERSITY_QUERY, key: "university", icon: Building2 },
  programs: { back: "/programs", label: "Программа", query: PROGRAM_QUERY, key: "program", icon: GraduationCap },
  courses: { back: "/courses", label: "Курс", query: COURSE_QUERY, key: "course", icon: BookOpen },
  topics: { back: "/topics", label: "Тема", query: TOPIC_QUERY, key: "topic", icon: Tags },
} as const;

// CatalogDetailPage открывает публичную карточку выбранной сущности.
export function CatalogDetailPage({ kind }: { kind: CatalogKind }) {
  const { id = "" } = useParams();
  const page = detailConfig[kind];
  const { data, loading, error } = useQuery<Record<string, CatalogItem>>(page.query, { variables: { id } });
  const item = data?.[page.key];
  const Icon = page.icon;

  if (loading && !item) return <main className="page-shell content-state"><Spinner label="Открываем элемент каталога…" /></main>;
  if (error || !item) return <main className="page-shell"><ErrorMessage message={error?.message ?? "Элемент не найден"} /></main>;

  return <main className="page-shell catalog-detail"><Link className="back-link" to={page.back}>← Назад в раздел</Link><article><div className="catalog-detail__icon"><Icon size={30} /></div><span className="section-kicker">{page.label}</span><h1>{itemTitle(item)}</h1><p>{itemDescription(item)}</p><dl>{detailRows(item).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Не указано"}</dd></div>)}</dl></article></main>;
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
