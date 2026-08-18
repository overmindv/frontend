import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AvatarCropper } from "./AvatarCropper";

vi.mock("react-easy-crop", () => ({
  default: ({ onCropComplete }: { onCropComplete: (area: unknown, pixels: { x: number; y: number; width: number; height: number }) => void }) => (
    <button onClick={() => onCropComplete({}, { x: 0, y: 0, width: 640, height: 640 })} type="button">
      Завершить тестовое кадрирование
    </button>
  ),
}));

test("автоматически формирует WebP после выбора и кадрирования", async () => {
  const onChange = vi.fn();
  const onProcessingChange = vi.fn();
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
    width: 640,
    height: 640,
    close: vi.fn(),
  }));
  vi.stubGlobal("Image", class {
    src = "";

    decode() {
      return Promise.resolve();
    }
  });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:avatar");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
    callback(new Blob(["webp"], { type: "image/webp" }));
  });
  const user = userEvent.setup();
  render(<AvatarCropper onChange={onChange} onProcessingChange={onProcessingChange} />);

  fireEvent.change(screen.getByLabelText("Фото профиля"), {
    target: { files: [new File(["source"], "avatar.png", { type: "image/png" })] },
  });
  await user.click(await screen.findByRole("button", { name: "Завершить тестовое кадрирование" }));

  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: "image/webp" })), { timeout: 1_000 });
  expect(onProcessingChange).toHaveBeenLastCalledWith(false);
  expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.95);
  expect(screen.getByText("Кадрирование применяется автоматически.")).toBeInTheDocument();
});
