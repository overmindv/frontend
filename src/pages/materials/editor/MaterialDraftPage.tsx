import { useQuery } from "@apollo/client";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MATERIAL_DRAFT_QUERY, type MaterialDraft } from "../../../api/materialDrafts";
import { isMaterialID, materialsHref } from "../../../api/materials";
import { Spinner } from "../../../components/common/Spinner";
import { useAuth } from "../../../context/AuthContext";
import { DraftEditor } from "./DraftEditor";
import { isMarkdownRevision, isOwnedDraft } from "./draftForm";
import "../materials.css";
import "./editor.css";

export default function MaterialDraftPage() {
  const { id } = useParams();
  const { userId } = useAuth();
  const query = useQuery<{ material: MaterialDraft | null }>(MATERIAL_DRAFT_QUERY, {
    variables: { id }, fetchPolicy: "no-cache", skip: !id || !isMaterialID(id),
  });
  const material = query.data?.material;
  const owned = id && isOwnedDraft(material, id, userId);
  const retry = query.error && query.error.graphQLErrors.every((error) => error.extensions?.code !== "NOT_FOUND");

  return <main className="page-shell materials-page material-editor">
    <Link className="back-link material-back" to={materialsHref(null, null, true)}>
      <ArrowLeft size={16} aria-hidden="true" /> Мои черновики
    </Link>
    {!id ? <DraftEditor key="new" authorId={userId} /> :
      query.loading ? <div className="content-state"><Spinner label="Загружаем черновик" /></div> :
      retry ? <div className="content-state">
        <p className="message message--error" role="alert">Не удалось загрузить черновик.</p>
        <button type="button" className="button button--ghost" onClick={() => void query.refetch().catch(() => undefined)}>Повторить</button>
      </div> : owned && isMarkdownRevision(material.revision) ? <DraftEditor key={id} material={material} authorId={userId} /> :
        <div className="content-state">
          <strong>{owned && material.revision?.format === "typst" ? "Редактор поддерживает только Markdown" : "Черновик недоступен"}</strong>
        </div>}
  </main>;
}
