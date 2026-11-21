import { useQuery } from "@apollo/client";
import { ArrowLeft, Clock3, GitCommitHorizontal, GitPullRequest } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { MATERIAL_TOPICS_QUERY, PUBLISHED_MATERIAL_QUERY, isMaterialID, materialDate, materialsHref, type PublishedMaterial } from "../../api/materials";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Spinner } from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";
import { MaterialAttachments } from "./MaterialAttachments";
import { MaterialMarkdown } from "./MaterialMarkdown";
import { MaterialHistory, MaterialRelatedTasks } from "./MaterialReadSections";
import "./materials.css";

export default function MaterialReadPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const topic = params.get("topic");
  const cursor = params.get("cursor");
  return <MaterialReadContent id={id} back={materialsHref(topic, cursor)} key={id} />;
}

function MaterialReadContent({ id, back }: { id: string; back: string }) {
  const { userId } = useAuth();
  const query = useQuery<{ publishedMaterial: PublishedMaterial | null }>(PUBLISHED_MATERIAL_QUERY, {
    variables: { id },
    skip: !isMaterialID(id),
    fetchPolicy: "no-cache",
  });
  const material = query.data?.publishedMaterial;
  const revision = material?.revision;
  const valid = material?.status === "published" && revision?.format === "markdown" && revision.id === material.publishedRevisionId;
  const missing = !isMaterialID(id) || query.error?.graphQLErrors.some((error) => error.extensions?.code === "NOT_FOUND");
  const date = materialDate(material?.publishedAt ?? null);
  const topicIds = material?.learning?.topicIds.filter(isMaterialID) ?? [];
  const topics = useQuery<{ topics: { id: string; title: string }[] }>(MATERIAL_TOPICS_QUERY, { skip: !valid || !topicIds.length });
  const backLink = <Link className="back-link material-back" to={back}><ArrowLeft size={15} aria-hidden="true" /> Материалы</Link>;

  if (query.loading) return <main className="page-shell material-reader">{backLink}<div className="content-state">
    <Spinner label="Открываем материал" />
  </div></main>;
  if (query.error && !missing) return <main className="page-shell material-reader">{backLink}<div className="content-state">
    <ErrorMessage message="Материал недоступен" />
    <button className="button button--ghost" type="button" onClick={() => void query.refetch().catch(() => undefined)}>Повторить</button>
  </div></main>;
  if (missing || !material || !revision || !valid) return <main className="page-shell material-reader">{backLink}<div className="content-state">
    <h1>Материал не найден</h1>
  </div></main>;

  const isOwner = userId !== null && userId === material.authorId;
  const showAside = !!(material.attachments.length || topicIds.length || isOwner);
  return <main className="page-shell material-reader">
    {backLink}
    <header className="page-heading material-reader-heading">
      <div>
        <span className="section-kicker">Материал</span>
        <h1>{material.title}</h1>
        {material.description && <p>{material.description}</p>}
        <div className="material-meta">
          <span><GitCommitHorizontal size={16} aria-hidden="true" /> Версия {revision.number}</span>
          {date && <time dateTime={material.publishedAt ?? undefined}>{date}</time>}
          {!!material.learning?.estimatedMinutes && <span><Clock3 size={15} aria-hidden="true" /> {material.learning.estimatedMinutes} мин</span>}
        </div>
        {!!topicIds.length && <div className="material-topics" aria-label="Темы материала">
          {topicIds.map((topicId, index) => <Link className="badge" key={topicId} to={materialsHref(topicId)}>
            {topics.data?.topics.find((topic) => topic.id === topicId)?.title ?? `Тема ${index + 1}`}
          </Link>)}
        </div>}
      </div>
      <Link className="button button--ghost" to={`/materials/${id}/changes/new`}>
        <GitPullRequest size={16} aria-hidden="true" /> Предложить правку
      </Link>
    </header>
    <div className={showAside ? "material-reader-layout with-aside" : "material-reader-layout"}>
      <article className="material-article">
        <MaterialMarkdown source={revision.source} />
      </article>
      {showAside && <aside className="material-aside">
        <MaterialAttachments files={material.attachments} />
        {topicIds[0] && <MaterialRelatedTasks topicId={topicIds[0]} />}
        {isOwner && <MaterialHistory id={id} />}
      </aside>}
    </div>
  </main>;
}
