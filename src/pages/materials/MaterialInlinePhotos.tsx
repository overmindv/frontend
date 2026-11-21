import { ChevronLeft, ChevronRight, Expand, Image } from "lucide-react";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import type { MaterialAttachment, MaterialPublication } from "../../api/materials";
import { MaterialPhotoFrame, MaterialPhotoViewer } from "./MaterialPhotoViewer";
import "./materialInlinePhotos.css";

export function MaterialInlinePhotos({ files, publication }: {
  files: MaterialAttachment[]; publication: MaterialPublication;
}) {
  const figure = useRef<HTMLElement>(null);
  const expand = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [fullIndex, setFullIndex] = useState<number | null>(null);
  const file = files[index];
  const title = file.title || "Фото";

  useEffect(() => {
    const element = figure.current;
    if (!element || visible || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setVisible(true);
      observer.disconnect();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  function move(offset: number) {
    setIndex((current) => Math.max(0, Math.min(files.length - 1, current + offset)));
  }

  function endTouch(event: TouchEvent) {
    const start = touch.current;
    touch.current = null;
    const end = event.changedTouches[0];
    if (!start || !end) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
  }

  return <figure ref={figure} className="material-inline-photos" aria-label="Группа фото">
    <div className="material-photo-stage material-inline-photo-stage"
      onTouchStart={(event) => {
        const point = event.touches.length === 1 ? event.touches[0] : null;
        touch.current = point ? { x: point.clientX, y: point.clientY } : null;
      }}
      onTouchEnd={endTouch} onTouchCancel={() => { touch.current = null; }}>
      {visible ? <MaterialPhotoFrame key={file.fileId} fileId={file.fileId}
        title={title} publication={publication} onRetry={() => expand.current?.focus()} /> :
        <button className="button button--ghost" type="button" onClick={() => setVisible(true)}>
          <Image size={18} aria-hidden="true" /> Показать фото
        </button>}
    </div>
    <figcaption className="material-inline-photo-controls">
      <span className="material-inline-photo-title" title={title}>{title}</span>
      <div className="material-inline-photo-pages">
        <button className="button button--ghost" type="button" aria-disabled={index === 0}
          aria-label="Предыдущий кадр" title="Предыдущий кадр" onClick={() => move(-1)}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <span role="status">{index + 1} / {files.length}</span>
        <button className="button button--ghost" type="button" aria-disabled={index === files.length - 1}
          aria-label="Следующий кадр" title="Следующий кадр" onClick={() => move(1)}>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <button ref={expand} className="button button--ghost" type="button"
        aria-label="Развернуть фото" title="Развернуть фото" onClick={() => setFullIndex(index)}>
        <Expand size={18} aria-hidden="true" />
      </button>
    </figcaption>
    {fullIndex !== null && <MaterialPhotoViewer file={files[fullIndex]} publication={publication}
      index={fullIndex} count={files.length} onSelect={setFullIndex} onClose={() => setFullIndex(null)} />}
  </figure>;
}
