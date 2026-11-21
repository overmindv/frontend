import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apolloClient } from "./client";
import { attachmentFileError, uploadMaterialAttachment } from "./materialMedia";
import { COMPLETE_MEDIA_UPLOAD_MUTATION, CREATE_MEDIA_UPLOAD_MUTATION } from "./mutations";
import { MEDIA_FILE_QUERY } from "./queries";

vi.mock("./client", () => ({ apolloClient: { mutate: vi.fn(), query: vi.fn() } }));
vi.mock("./mediaStorage", async (importOriginal) => ({
  ...await importOriginal<typeof import("./mediaStorage")>(), mediaStorageOrigins: ["https://files.example.org"],
}));

const fileId = "00000000-0000-4000-8000-000000000208";
const uploadURL = "https://files.example.org/bucket";
const fetchMock = vi.fn();
const mutate = vi.mocked(apolloClient.mutate);
const query = vi.mocked(apolloClient.query);

function sampleFile() {
  const file = new File(["pdf"], "example.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: () => Promise.resolve(new ArrayBuffer(3)) });
  return file;
}

function session(url: string, mode = "single") {
  return { data: { createMediaUpload: { fileId, url, mode, fields: [{ name: "key", value: "test-file" }] } } };
}

beforeEach(() => {
  mutate.mockReset();
  query.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("crypto", { subtle: { digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)) } });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("material attachment upload", () => {
  it("uses private Media files and completes only after ready", async () => {
    mutate.mockResolvedValueOnce(session(uploadURL)).mockResolvedValueOnce({ data: { completeMediaUpload: { id: fileId } } });
    fetchMock.mockResolvedValue({ ok: true });
    query.mockResolvedValue({ data: { mediaFile: { status: "ready" } }, loading: false, networkStatus: 7 });
    const file = sampleFile();
    await expect(uploadMaterialAttachment(file, new AbortController().signal)).resolves.toEqual({
      fileId, kind: "pdf", title: "example.pdf",
    });
    expect(mutate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      mutation: CREATE_MEDIA_UPLOAD_MUTATION, variables: { input: {
        originalName: file.name, contentType: "application/pdf", sizeBytes: 3,
        checksumSha256: "00".repeat(32), purpose: "attachment", visibility: "private",
      } },
    }));
    expect(fetchMock).toHaveBeenCalledWith(uploadURL, expect.objectContaining({
      method: "POST", redirect: "error", credentials: "omit", referrerPolicy: "no-referrer",
    }));
    expect(fetchMock.mock.calls[0][1].body.get("file")).toBe(file);
    expect(mutate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      mutation: COMPLETE_MEDIA_UPLOAD_MUTATION, variables: { input: { fileId, parts: [] } },
    }));
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ query: MEDIA_FILE_QUERY, variables: { id: fileId } }));
  });

  it.each([
    ["https://files.example.org.invalid/bucket", "single"],
    ["https://someone@files.example.org/bucket", "single"],
    [uploadURL, "multipart"],
  ])("does not send bytes to an invalid storage target: %s (%s)", async (url, mode) => {
    mutate.mockResolvedValueOnce(session(url, mode));
    await expect(uploadMaterialAttachment(sampleFile(), new AbortController().signal)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledOnce();
  });

  it("rejects invalid file types and stops before sending a cancelled upload", async () => {
    expect(attachmentFileError(new File(["text"], "unsafe.html", { type: "text/html" }))).not.toBeNull();
    const tooLarge = sampleFile();
    Object.defineProperty(tooLarge, "size", { value: 20 * 1024 * 1024 + 1 });
    expect(attachmentFileError(tooLarge)).toContain("20 МБ");
    const controller = new AbortController();
    controller.abort();
    await expect(uploadMaterialAttachment(sampleFile(), controller.signal)).rejects.toThrow();
    expect(mutate).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
