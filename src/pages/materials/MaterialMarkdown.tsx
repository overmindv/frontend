import Markdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { materialMarkdownLink } from "./materialLinks";

const components: Components = {
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

export function MaterialMarkdown({ source }: { source: string }) {
  return <div className="material-markdown">
    <Markdown skipHtml disallowedElements={["img"]} remarkPlugins={[remarkGfm]} components={components}
      urlTransform={(value, key) => key === "href" ? materialMarkdownLink(defaultUrlTransform(value)) : undefined}>
      {source}
    </Markdown>
  </div>;
}
