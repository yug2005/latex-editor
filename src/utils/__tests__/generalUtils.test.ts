import { getFilename } from "../generalUtils";

describe("generalUtils", () => {
  describe("getFilename", () => {
    it("should extract filename from unix path", () => {
      expect(getFilename("/path/to/file.tex")).toBe("file.tex");
    });

    it("should extract filename from windows path", () => {
      expect(getFilename("C:\\path\\to\\file.tex")).toBe("file.tex");
    });

    it("should return default name if path is empty", () => {
      expect(getFilename("")).toBe("Untitled.tex");
    });

    it("should handle just the filename", () => {
      expect(getFilename("file.tex")).toBe("file.tex");
    });
  });
});
