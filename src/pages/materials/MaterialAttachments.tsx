import { useApolloClient } from "@apollo/client";
import { Archive, Download, ExternalLink, FileImage, FileText, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";
import { MATERIAL_DOWNLOAD_QUERY, isMaterialID, type MaterialAttachment, type MaterialDownloadResult } from "../../api/materials";
import { materialDownloadOrigins, materialDownloadURL } from "./materialLinks";

const kinds = {
  image: { label: "Изображение", icon: FileImage },
  attachment: { label: "Файл", icon: Paperclip },
  pdf: { label: "PDF", icon: FileText },
  archive: { label: "Архив", icon: Archive },
};

type Publication = { materialId: string; revisionId: string };

function MaterialFile({ file, publication }: { file: MaterialAttachment; publication: Publication }) {
  const client = useApolloClient();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [link, setLink] = useState<{ href: string; expiresAt: number } | null>(null);
  const kind = kinds[file.kind];
  const Icon = kind.icon;

  useEffect(() => {
    if (!link) return;
    const timer = window.setTimeout(() => setLink(null), Math.min(link.expiresAt - Date.now(), 2147483647));
    return () => window.clearTimeout(timer);
  }, [link]);

  async function requestDownload() {
    if (pending || !isMaterialID(file.fileId)) return;
    setPending(true);
    setFailed(false);
    try {
      const { data } = await client.query<MaterialDownloadResult>({
        query: MATERIAL_DOWNLOAD_QUERY,
        variables: { ...publication, fileId: file.fileId },
        fetchPolicy: "no-cache",
      });
      const download = data.publishedMaterialAttachmentDownload;
      const href = download && materialDownloadURL(download.url, materialDownloadOrigins);
      const expiresAt = download ? Date.parse(download.expiresAt) : 0;
      if (href && expiresAt > Date.now()) setLink({ href, expiresAt });
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return <li className="material-file">
    <Icon size={17} aria-hidden="true" />
    <div><strong>{file.title || kind.label}</strong>{file.title && <small>{kind.label}</small>}
      {failed && <small role="status">Скачивание недоступно</small>}
    </div>
    {link ? <a className="button button--ghost" href={link.href} rel="noopener noreferrer" target="_blank">
      Открыть <ExternalLink size={14} aria-hidden="true" />
    </a> : <button className="button button--ghost" type="button" disabled={pending} onClick={() => void requestDownload()}>
      <Download size={15} aria-hidden="true" /> {pending ? "Загрузка" : "Скачать"}
    </button>}
  </li>;
}

export function MaterialAttachments({ files, publication }: { files: MaterialAttachment[]; publication: Publication }) {
  const validFiles = files.filter((file) => Object.hasOwn(kinds, file.kind) && isMaterialID(file.fileId));
  if (!validFiles.length) return null;
  return <section className="material-aside-section">
    <h2>Вложения</h2>
    <ul className="material-file-list">
      {validFiles.map((file) => <MaterialFile file={file} publication={publication} key={file.fileId} />)}
    </ul>
  </section>;
}
