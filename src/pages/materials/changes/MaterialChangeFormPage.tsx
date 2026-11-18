import { useQuery } from "@apollo/client";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MATERIAL_CHANGE_QUERY, type MaterialChange } from "../../../api/materialChanges";
import { PUBLISHED_MATERIAL_QUERY, isMaterialID, type PublishedMaterial } from "../../../api/materials";
import { Spinner } from "../../../components/common/Spinner";
import { useAuth } from "../../../context/AuthContext";
import { ChangeForm } from "./ChangeForm";
import { changeHref } from "./changeRoutes";
import "../materials.css";
import "./changes.css";
import "../editor/editor.css";

export default function MaterialChangeFormPage() {
  const { id = "", changeId } = useParams();
  const { userId } = useAuth();
  const publication = useQuery<{ publishedMaterial: PublishedMaterial | null }>(PUBLISHED_MATERIAL_QUERY, {
    variables: { id }, skip: !!changeId || !isMaterialID(id), fetchPolicy: "no-cache",
  });
  const proposal = useQuery<{ materialChangeProposal: MaterialChange | null }>(MATERIAL_CHANGE_QUERY, {
    variables: { id: changeId, includeSource: true }, skip: !changeId || !isMaterialID(changeId), fetchPolicy: "no-cache",
  });
  const result = changeId ? proposal : publication;
  const item = publication.data?.publishedMaterial;
  const edit = proposal.data?.materialChangeProposal;
  const base = item?.revision;
  const back = changeId && isMaterialID(changeId) ? changeHref(changeId) : isMaterialID(id) ? `/materials/${id}` : "/materials";
  const creatable = !changeId && item?.id === id && item.status === "published" && base?.format === "markdown" &&
    base.id === item.publishedRevisionId && isMaterialID(base.id);
  const editable = !!changeId && edit?.id === changeId && edit.status === "open" && !!userId &&
    edit.authorId === userId && isMaterialID(edit.head.id) && typeof edit.head.source === "string";
  const retry = result.error && result.error.graphQLErrors.every(({ extensions }) =>
    extensions?.code !== "NOT_FOUND" && extensions?.code !== "PERMISSION_DENIED");

  return <main className="page-shell material-change-page">
    <Link className="back-link material-back" to={back}>
      <ArrowLeft size={16} aria-hidden="true" /> {changeId ? "К предложению" : "К материалу"}
    </Link>
    {result.loading ? <div className="content-state"><Spinner label="Открываем редактор" /></div> :
      retry ? <div className="content-state">
        <p role="alert">Не удалось открыть редактор.</p>
        <button type="button" className="button button--ghost" onClick={() => void result.refetch().catch(() => undefined)}>Повторить</button>
      </div> : creatable ? <ChangeForm key={id} target={{ materialId: id, baseRevisionId: base.id, number: base.number }}
        source={base.source} title={item.title} /> :
        editable ? <ChangeForm key={changeId} target={{ proposalId: changeId, expectedHeadId: edit.head.id, number: edit.head.ordinal }}
          source={edit.head.source!} /> : <div className="content-state"><h1>Редактор недоступен</h1></div>}
  </main>;
}
