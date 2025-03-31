import React from "react";
import { render, screen } from "@testing-library/react";
import LatexPreview from "../LatexPreview";

// Mock the compileLatex utility
jest.mock("../../utils/latexCompiler", () => {
  const mockCompiler = jest.fn((content) => {
    if (content.includes("error")) {
      throw new Error("Compilation error");
    }
    return `<html><body><div id="compiled">${content}</div></body></html>`;
  });
  return mockCompiler;
});

describe("LatexPreview", () => {
  it("renders the component with Preview header", () => {
    render(<LatexPreview content="\\section{Test}" />);

    // Initially we should see the preview header
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("renders an iframe for the preview content", () => {
    render(<LatexPreview content="\\section{Test}" />);

    // Check if iframe is present
    const iframe = screen.getByTitle("LaTeX Preview");
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe("IFRAME");
  });

  it("has the correct sandbox attributes for security", () => {
    render(<LatexPreview content="\\section{Test}" />);

    const iframe = screen.getByTitle("LaTeX Preview");
    expect(iframe).toHaveAttribute(
      "sandbox",
      "allow-same-origin allow-scripts"
    );
  });
});
