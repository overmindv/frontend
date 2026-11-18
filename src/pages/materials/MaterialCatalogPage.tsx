import { useQuery } from "@apollo/client";
import { ArrowLeft, ArrowRight, BookOpen, Clock3, Plus } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MATERIALS_QUERY, MATERIAL_TOPICS_QUERY, isMaterialID, materialDate, materialsHref, type MaterialCatalogResult } from "../../api/materials";
import { MY_MATERIAL_DRAFTS_QUERY } from "../../api/materialDrafts";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Spinner } from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";
import "./materials.css";

export default function MaterialCatalogPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const drafts = params.get("view") === "drafts";
  const requestedTopic = params.get("topic");
  const topic = requestedTopic && isMaterialID(requestedTopic) ? requestedTopic : null;
  const cursor = params.get("cursor");
  const topics = useQuery<{ topics: { id: string; title: string }[] }>(MATERIAL_TOPICS_QUERY);
  const invalid = (requestedTopic !== null && !topic) || (cursor?.length ?? 0) > 256;
  const catalog = useQuery<MaterialCatalogResult>(drafts ? MY_MATERIAL_DRAFTS_QUERY : MATERIALS_QUERY, {
    variables: drafts ? { authorId: userId, topicId: topic, cursor } : { topicId: topic, cursor },
    fetchPolicy: drafts ? "no-cache" : "network-only",
    skip: invalid || (drafts && (!userId || !isMaterialID(userId))),
  });
  const page = catalog.data?.materials;
  const items = page?.items.filter((item) => isMaterialID(item.id)) ?? [];
  const choices = topics.data?.topics ?? [];
  const readerSearch = materialsHref(topic, cursor).slice("/materials".length);

  return <main className="page-shell materials-page">
    <header className="page-heading material-page-heading">
      <div><span className="section-kicker">Каталог</span><h1><BookOpen size={26} aria-hidden="true" /> Материалы</h1></div>
      <Link className="button button--primary" to="/materials/new"><Plus size={17} aria-hidden="true" /> Новый черновик</Link>
    </header>
    <nav className="material-view-tabs" aria-label="Разделы материалов">
      <Link aria-current={drafts ? undefined : "page"} to={materialsHref(topic)}>Опубликованные</Link>
      <Link aria-current={drafts ? "page" : undefined} to={materialsHref(topic, null, true)}>Мои черновики</Link>
    </nav>
    <div className="material-filters">
      <label>Тема
        <select value={topic ?? ""} onChange={(event) => navigate(materialsHref(event.target.value, null, drafts))}>
          <option value="">Все темы</option>
          {topic && !choices.some((item) => item.id === topic) && <option value={topic}>Выбранная тема</option>}
          {choices.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <Link className="button button--ghost" to="/topics">Каталог тем <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
    {invalid ? <div className="content-state">
      <strong>Страница не найдена</strong><Link className="back-link" to="/materials">Все материалы</Link>
    </div> : catalog.loading ? <div className="content-state"><Spinner label="Загружаем материалы" /></div> :
      catalog.error || !page ? <div className="content-state">
        <ErrorMessage message="Не удалось загрузить материалы." />
        <button className="button button--ghost" type="button" onClick={() => void catalog.refetch().catch(() => undefined)}>
          Повторить
        </button>
      </div> : items.length === 0 ? <div className="content-state">
        <strong>{drafts ? "Нет черновиков" : "Нет опубликованных материалов"}</strong>
      </div> :
        <ul className="material-list">
          {items.map((item) => <li key={item.id}>
            <Link className="material-list__item" to={drafts ? `/materials/${item.id}/edit` : `/materials/${item.id}${readerSearch}`}>
              <div>
                <strong>{item.title}</strong>
                <div className="material-meta">
                  <time dateTime={item.createdAt}>{materialDate(item.createdAt)}</time>
                  {!!item.learning?.estimatedMinutes && <span><Clock3 size={14} aria-hidden="true" /> {item.learning.estimatedMinutes} мин</span>}
                </div>
              </div>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </li>)}
        </ul>}
    {!invalid && (cursor || page?.nextCursor) && <nav className="material-pagination" aria-label="Страницы материалов">
      {cursor && <Link className="button button--ghost" to={materialsHref(topic, null, drafts)}><ArrowLeft size={15} aria-hidden="true" /> В начало</Link>}
      {!catalog.loading && !catalog.error && page?.nextCursor && <Link className="button button--ghost" to={materialsHref(topic, page.nextCursor, drafts)}>
        Следующая страница <ArrowRight size={15} aria-hidden="true" />
      </Link>}
    </nav>}
  </main>;
}
