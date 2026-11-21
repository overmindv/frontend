import { useApolloClient } from "@apollo/client";
import { Archive, Download, ExternalLink, FileImage, FileText, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";
import { isMaterialID, requestMaterialAttachment, type MaterialAttachment, type MaterialAttachmentLink,
  type MaterialPublication } from "../../api/materials";
import { MaterialPhotoViewer } from "./MaterialPhotoViewer";

const kinds = {
  image: { label: "Изображение", icon: FileImage },
  attachment: { label: "Файл", icon: Paperclip },
  pdf: { label: "PDF", icon: FileText },
  archive: { label: "Архив", icon: Archive },
};

function MaterialFile({ file, publication, onPreview }: {
  file: MaterialAttachment; publication: MaterialPublication; onPreview?: () => void;
}) {
  const client = useApolloClient();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [link, setLink] = useState<MaterialAttachmentLink | null>(null);
  const kind = kinds[file.kind];
  const Icon = kind.icon;
  const title = file.title || kind.label;

  useEffect(() => {
    if (!link) return;
    const timer = window.setTimeout(() => setLink(null), Math.min(link.expiresAt - Date.now(), 2147483647));
    return () => window.clearTimeout(timer);
  }, [link]);

  async function requestDownload() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      const next = await requestMaterialAttachment(client, publication, file.fileId);
      if (next) setLink(next);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return <li className="material-file">
    <Icon size={17} aria-hidden="true" />
    <div>
      {onPreview ? <button className="material-file-preview" type="button" aria-label={`Открыть фото: ${title}`} onClick={onPreview}>
        {title}
      </button> : <strong>{title}</strong>}
      {file.title && <small>{kind.label}</small>}
      {failed && <small role="status">Скачивание недоступно</small>}
    </div>
    {link ? <a className="button button--ghost" href={link.href} rel="noopener noreferrer" target="_blank">
      Открыть <ExternalLink size={14} aria-hidden="true" />
    </a> : <button className="button button--ghost" type="button" disabled={pending} onClick={() => void requestDownload()}>
      <Download size={15} aria-hidden="true" /> {pending ? "Загрузка" : "Скачать"}
    </button>}
  </li>;
}

export function MaterialAttachments({ files, publication }: { files: MaterialAttachment[]; publication: MaterialPublication }) {
  const [photoID, setPhotoID] = useState<string | null>(null);
  const validFiles = files.filter((file) => Object.hasOwn(kinds, file.kind) && isMaterialID(file.fileId));
  const photos = validFiles.filter((file) => file.kind === "image");
  const photoIndex = photos.findIndex((file) => file.fileId === photoID);
  if (!validFiles.length) return null;
  return <section className="material-attachments">
    <h2>Вложения</h2>
    <ul className="material-file-list">
      {validFiles.map((file) => <MaterialFile file={file} publication={publication} key={file.fileId}
        onPreview={file.kind === "image" ? () => setPhotoID(file.fileId) : undefined} />)}
    </ul>
    {photoIndex >= 0 && <MaterialPhotoViewer file={photos[photoIndex]} publication={publication}
      index={photoIndex} count={photos.length} onSelect={(index) => setPhotoID(photos[index].fileId)}
      onClose={() => setPhotoID(null)} />}
  </section>;
}
