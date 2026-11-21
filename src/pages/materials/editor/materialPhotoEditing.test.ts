import { describe, expect, it } from "vitest";
import { insertPhotoGroup, photoAttachmentProblem, planPhotoInsertion } from "./materialPhotoEditing";

const id = "00000000-0000-4000-8000-000000000101";
const photo = { fileId: id, kind: "image" as const, title: "Photo", position: 0 };
const block = "```ovm-photos\n" + id + "\n```";

describe("photo group editing", () => {
  it("does not cut through an existing Markdown block", () => {
    const first = "```go\npackage main\n```";
    const source = first + "\n\nNext.";
    const { plan } = planPhotoInsertion(source, source.indexOf("package") + 4);
    expect(plan?.offset).toBe(first.length);
    if (!plan) throw new Error("Missing insertion plan");
    expect(insertPhotoGroup(plan, [id])?.source).toBe(first + "\n\n" + block + "\n\nNext.");
  });

  it("does not write a gallery into an unclosed fence", () => {
    const source = "```go\npackage main";
    const { plan } = planPhotoInsertion(source, source.length);
    if (!plan) throw new Error("Missing insertion plan");
    expect(insertPhotoGroup(plan, [id])).toBeNull();
  });

  it("ignores a gallery example inside code and rejects references beyond the limit", () => {
    expect(photoAttachmentProblem("````md\n" + block + "\n````", [])).toBe("");
    const source = Array.from({ length: 31 }, () => block).join("\n\n");
    expect(planPhotoInsertion(source, source.length).plan?.limit).toBe(1);
    expect(photoAttachmentProblem(source + "\n\n" + block, [photo])).toBe("");
    expect(photoAttachmentProblem(source + "\n\n" + block + "\n\n" + block, [photo])).toContain("32");
  });
});
