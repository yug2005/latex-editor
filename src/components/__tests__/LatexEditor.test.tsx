import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LatexEditor from "../LatexEditor";
import * as monaco from "monaco-editor";

// Mock the monaco-editor/react
jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  Editor: ({ value, onChange, onMount, options }: any) => (
    <div data-testid="mock-monaco-editor">
      <textarea
        data-testid="mock-editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        data-testid="mock-editor-mount"
        onClick={() => {
          const mockEditor = {
            getModel: () => ({
              updateOptions: jest.fn(),
              getOffsetAt: jest.fn().mockReturnValue(0),
            }),
            updateOptions: jest.fn(),
            onDidChangeCursorPosition: jest
              .fn()
              .mockReturnValue({ dispose: jest.fn() }),
          };
          onMount(mockEditor);
          return mockEditor;
        }}
      >
        Mount Editor
      </button>
      <div data-testid="editor-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

// Mock InlineAIEdit component
jest.mock("../InlineAIEdit", () => ({
  __esModule: true,
  default: ({ editor }: any) => (
    <div data-testid="mock-ai-suggestion">
      {editor ? "Editor is available" : "Editor is not available"}
    </div>
  ),
}));

// Mock monaco configuration utilities
jest.mock("../../utils/monacoConfig", () => ({
  initializeMonaco: jest.fn(),
}));

describe("LatexEditor", () => {
  const defaultProps = {
    value: "\\section{Test}",
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the editor with default props", () => {
    render(<LatexEditor {...defaultProps} />);
    expect(screen.getByTestId("mock-monaco-editor")).toBeInTheDocument();
    expect(screen.getByTestId("mock-editor-textarea")).toHaveValue(
      "\\section{Test}"
    );
  });

  it("calls onChange when text changes", () => {
    render(<LatexEditor {...defaultProps} />);
    const textarea = screen.getByTestId("mock-editor-textarea");
    fireEvent.change(textarea, { target: { value: "\\section{Updated}" } });
    expect(defaultProps.onChange).toHaveBeenCalledWith("\\section{Updated}");
  });

  it("calls onEditorDidMount when the editor is mounted", () => {
    const onEditorDidMount = jest.fn();
    render(
      <LatexEditor {...defaultProps} onEditorDidMount={onEditorDidMount} />
    );

    // Trigger the onMount callback
    fireEvent.click(screen.getByTestId("mock-editor-mount"));

    // Check if the callback was called
    expect(onEditorDidMount).toHaveBeenCalled();
  });

  it("renders the toolbar when showToolbar is true", () => {
    render(<LatexEditor {...defaultProps} showToolbar={true} />);
    expect(screen.getByText(/AI On/)).toBeInTheDocument();
  });

  it("does not render the toolbar when showToolbar is false", () => {
    render(<LatexEditor {...defaultProps} showToolbar={false} />);
    expect(screen.queryByText(/AI On/)).not.toBeInTheDocument();
  });

  it("toggles AI when the AI button is clicked", () => {
    render(<LatexEditor {...defaultProps} />);

    // Initially AI should be enabled
    expect(screen.getByText(/AI On/)).toBeInTheDocument();

    // Click the AI toggle button
    fireEvent.click(screen.getByText(/AI On/));

    // AI should now be disabled
    expect(screen.getByText(/AI Off/)).toBeInTheDocument();
  });

  it("does not show AI suggestions when AI is disabled", () => {
    render(<LatexEditor {...defaultProps} />);

    // Initially AI suggestion should be visible
    expect(screen.getByTestId("mock-ai-suggestion")).toBeInTheDocument();

    // Disable AI
    fireEvent.click(screen.getByText(/AI On/));

    // AI suggestion should no longer be visible
    expect(screen.queryByTestId("mock-ai-suggestion")).not.toBeInTheDocument();
  });

  it("applies read-only mode correctly", () => {
    render(<LatexEditor {...defaultProps} readOnly={true} />);

    // Check if read-only class is applied
    expect(
      screen.getByTestId("mock-monaco-editor").parentElement?.parentElement
    ).toHaveClass("latex-editor-readonly");

    // Check if editor options include readOnly: true
    const optionsElement = screen.getByTestId("editor-options");
    expect(optionsElement.textContent).toContain('"readOnly":true');
  });
});
