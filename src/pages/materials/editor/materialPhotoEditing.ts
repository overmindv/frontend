import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import type { MaterialAttachment } from "../../../api/materials";
import { isPhotoFence, maxInlinePhotoReferences, maxPhotosPerGroup, parsePhotoGroup } from "../materialPhotoSyntax";

const parser = unified().use(remarkParse).use(remarkGfm).freeze();
const fence = "```";
const invalidGroup = "Проверьте блоки фото: от 1 до 10 разных вложений в каждой группе.";
const tooMany = "В тексте может быть не больше 32 ссылок на фото.";

type SyntaxNode = {
  type: string;
  value?: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: readonly SyntaxNode[];
};

function photoBlocks(source: string, root: SyntaxNode) {
  const pending = [root];
  const ids: string[] = [];
  const starts = new Set<number>();
  for (let node = pending.pop(); node; node = pending.pop()) {
    if (node.children) for (const child of node.children) pending.push(child);
    const start = node.position?.start.offset;
    if (node.type !== "code" || start === undefined || !isPhotoFence(source, start)) continue;
    const group = parsePhotoGroup((node.value ?? "") + "\n");
    if (!group) return { ids, starts, problem: invalidGroup };
    ids.push(...group);
    if (ids.length > maxInlinePhotoReferences) return { ids, starts, problem: tooMany };
    starts.add(start);
  }
  return { ids, starts, problem: "" };
}

export function photoAttachmentProblem(source: string, files: MaterialAttachment[]): string {
  const { ids, problem } = photoBlocks(source, parser.parse(source));
  if (problem || !ids.length) return problem;
  const attachments = new Set(files.filter(({ kind }) => kind === "image").map(({ fileId }) => fileId));
  return ids.some((id) => !attachments.has(id)) ? "В тексте есть фото, которого нет во вложениях." : "";
}

export type PhotoInsertion = { source: string; offset: number; limit: number };

export function planPhotoInsertion(source: string, cursor: number): { plan?: PhotoInsertion; problem?: string } {
  const root = parser.parse(source);
  const existing = photoBlocks(source, root);
  if (existing.problem) return { problem: existing.problem };
  const room = maxInlinePhotoReferences - existing.ids.length;
  if (room <= 0) return { problem: tooMany };

  const caret = Math.max(0, Math.min(cursor, source.length));
  const containing = root.children.find(({ position }) =>
    (position?.start.offset ?? caret) < caret && caret < (position?.end.offset ?? caret));
  return { plan: { source, offset: containing?.position?.end.offset ?? caret, limit: Math.min(room, maxPhotosPerGroup) } };
}

export function insertPhotoGroup(plan: PhotoInsertion, ids: string[]) {
  const list = ids.join("\n");
  if (ids.length > plan.limit || !parsePhotoGroup(list)) return null;
  const before = plan.source.slice(0, plan.offset);
  const after = plan.source.slice(plan.offset);
  const left = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const right = !after || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const block = fence + "ovm-photos\n" + list + "\n" + fence;
  const end = before + left + block + right;
  const source = end + after;

  const result = photoBlocks(source, parser.parse(source));
  if (result.problem || !result.starts.has(before.length + left.length)) return null;
  return { source, caret: end.length };
}
