import { AI_MODELS } from "../aiService";

describe("AI Service", () => {
  beforeEach(() => {
    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("AI_MODELS", () => {
    it("should contain all expected models", () => {
      // Log all models for debugging
      const modelKeys = Object.keys(AI_MODELS);
      console.log = jest.fn();

      // Test that the expected keys exist
      expect(modelKeys).toContain("GPT-4o");
      expect(modelKeys).toContain("GPT-3.5");
      expect(modelKeys).toContain("GPT-4");

      // Test that the values are correct
      expect(AI_MODELS["GPT-4o"]).toBe("gpt-4o");
      expect(AI_MODELS["GPT-3.5"]).toBe("gpt-3.5-turbo");
      expect(AI_MODELS["GPT-4"]).toBe("gpt-4-turbo");

      // Check that we have the expected number of models
      expect(Object.keys(AI_MODELS).length).toBeGreaterThanOrEqual(5);
    });
  });
});
