import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MaterialMarkdown } from "./MaterialMarkdown";
import { materialDownloadURL, materialMarkdownLink } from "./materialLinks";

describe("MaterialMarkdown", () => {
  it("renders GFM without allowing HTML, external images or unsafe URLs", () => {
    const source = [
      "# Циклы", "",
      "<script>blocked</script>", "",
      "<iframe src='https://invalid.example'></iframe>", "",
      "![](https://invalid.example/pixel.gif)", "",
      "[Справочник](https://docs.example/guide)",
      "[К теме](/topics/topic-1)",
      "[Плохая схема](javascript:void%200)",
      "[Чужой адрес](//invalid.example/page)", "",
      "| Операция | Сложность |", "| --- | --- |", "| Поиск | O(n) |",
    ].join("\n");
    const { container } = render(<MemoryRouter><MaterialMarkdown source={source} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Циклы", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(container.querySelector("script,iframe,img")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Плохая схема" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Чужой адрес" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Справочник" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "К теме" })).toHaveAttribute("href", "/topics/topic-1");
  });
});

describe("material links", () => {
  it.each(["/topics/../admin", "/materials/%2e%2e/admin", "http://example.org/", "data:text/plain,hi", "/\\example.org", "https://user@example.org/"])(
    "blocks Markdown destination %s",
    (url) => expect(materialMarkdownLink(url)).toBeUndefined(),
  );

  it("opens files only through an allowlisted storage origin", () => {
    const origins = ["https://files.example", "http://localhost:9000", "http://files.example"];
    expect(materialDownloadURL("https://files.example/content/a.pdf?sig=fixture", origins))
      .toBe("https://files.example/content/a.pdf?sig=fixture");
    expect(materialDownloadURL("http://localhost:9000/content/a.pdf", origins)).toBeDefined();
    expect(materialDownloadURL("https://files.example.invalid/content/a.pdf", origins)).toBeUndefined();
    expect(materialDownloadURL("http://files.example/content/a.pdf", origins)).toBeUndefined();
    expect(materialDownloadURL("https://files.example@invalid.example/content/a.pdf", origins)).toBeUndefined();
  });
});
