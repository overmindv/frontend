import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import Markdown, { defaultUrlTransform, type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { materialMarkdownLink } from "./materialLinks";
import { isPhotoFence, parsePhotoGroup } from "./materialPhotoSyntax";

type RenderPhotos = (ids: string[]) => ReactNode;
const PhotoBlocks = createContext<{ source: string; photos?: RenderPhotos }>({ source: "" });

function MaterialCodeBlock({ node, children }: ComponentProps<"pre"> & ExtraProps) {
  const { source, photos } = useContext(PhotoBlocks);
  const code = node?.children[0];
  if (code?.type === "element" && code.tagName === "code" && isPhotoFence(source, node?.position?.start.offset)) {
    const body = code.children.map((part) => part.type === "text" ? part.value : "").join("");
    const ids = parsePhotoGroup(body);
    if (!ids) return <p>Группа фото недоступна</p>;
    return photos ? photos(ids) : <p>Фото: {ids.length}</p>;
  }
  return <pre>{children}</pre>;
}

const components: Components = {
  pre: MaterialCodeBlock,
  h1({ children }) {
    return <h2>{children}</h2>;
  },
  a({ href, children }) {
    if (!href) return <span>{children}</span>;
    if (href.startsWith("/")) return <Link to={href}>{children}</Link>;
    if (href.startsWith("#")) return <a href={href}>{children}</a>;
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  },
};

export function MaterialMarkdown({ source, photos }: { source: string; photos?: RenderPhotos }) {
  return <PhotoBlocks.Provider value={{ source, photos }}>
    <div className="material-markdown">
      <Markdown skipHtml disallowedElements={["img"]} remarkPlugins={[remarkGfm]} components={components}
        urlTransform={(value, key) => key === "href" ? materialMarkdownLink(defaultUrlTransform(value)) : undefined}>
        {source}
      </Markdown>
    </div>
  </PhotoBlocks.Provider>;
}
