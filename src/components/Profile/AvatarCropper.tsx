import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

interface Props {
  onChange: (blob: Blob | null) => void;
  onProcessingChange?: (processing: boolean) => void;
  onSelectionChange?: (selected: boolean) => void;
}

// AvatarCropper валидирует фотографию и формирует квадратный WebP без загрузки исходника.
export function AvatarCropper({ onChange, onProcessingChange, onSelectionChange }: Props) {
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source);
  }, [source]);

  useEffect(() => {
    if (!source || !pixels) return;

    let active = true;
    onProcessingChange?.(true);
    const timeout = window.setTimeout(() => {
      void cropWebP(source, pixels)
        .then((blob) => {
          if (!active) return;

          onChange(blob);
          setError(null);
        })
        .catch(() => {
          if (!active) return;

          onChange(null);
          setError("Не удалось обработать фотографию.");
        })
        .finally(() => {
          if (active) onProcessingChange?.(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [onChange, onProcessingChange, pixels, source]);

  // select проверяет выбранный файл и подготавливает его для квадратного кадрирования.
  const select = async (file?: File) => {
    setError(null);
    onChange(null);
    setPixels(null);
    onSelectionChange?.(Boolean(file));
    onProcessingChange?.(Boolean(file));
    if (!file) {
      setSource(null);
      onProcessingChange?.(false);

      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSource(null);
      setError("Разрешены JPEG, PNG и WebP.");
      onProcessingChange?.(false);

      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSource(null);
      setError("Фото должно быть не больше 5 MiB.");
      onProcessingChange?.(false);

      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const imagePixels = bitmap.width * bitmap.height;
      bitmap.close();
      if (imagePixels > 12_000_000) {
        setSource(null);
        setError("Фото должно быть не больше 12 мегапикселей.");
        onProcessingChange?.(false);

        return;
      }

      setSource(URL.createObjectURL(file));
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch {
      setSource(null);
      setError("Не удалось прочитать фотографию.");
      onProcessingChange?.(false);
    }
  };

  return <div className="avatar-editor">
    <label className="field"><span>Фото профиля</span><input accept="image/jpeg,image/png,image/webp" onChange={(event) => void select(event.target.files?.[0])} type="file" /></label>
    {error && <div className="message message--error" role="alert">{error}</div>}
    {source && <>
      <div className="avatar-crop"><Cropper image={source} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={(_, area) => setPixels(area)} onZoomChange={setZoom} /></div>
      <label className="field"><span>Масштаб</span><input min="1" max="3" step="0.05" type="range" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <small>Кадрирование применяется автоматически.</small>
    </>}
  </div>;
}

// cropWebP вырезает выбранную область и возвращает качественный квадратный WebP до 1536 px.
async function cropWebP(source: string, area: Area): Promise<Blob> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const size = Math.max(1, Math.min(1536, Math.round(Math.min(area.width, area.height))));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas недоступен");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("WebP encoding failed")), "image/webp", 0.95));
}
