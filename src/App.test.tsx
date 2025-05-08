import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

// Mock the LatexContextSystem component
jest.mock("./components/LatexContextSystem", () => {
  // Create a mock context with all the required functions
  const mockContextValue = {
    setCurrentModel: jest.fn(),
    setCurrentEditor: jest.fn(),
    getCurrentDocument: jest.fn().mockReturnValue(""),
    getCurrentCursorInfo: jest.fn().mockReturnValue({
      position: { lineNumber: 1, column: 5 },
      offset: 5,
      lineContent: "",
      wordRange: null,
      wordAtPosition: undefined,
    }),
    getVisibleRangeInfo: jest.fn().mockReturnValue({
      startLineNumber: 1,
      endLineNumber: 10,
      content: "",
    }),
    getRecentEditsSummary: jest.fn().mockReturnValue([]),
    updateCursorInfo: jest.fn(),
    updateVisibleRange: jest.fn(),
    processEditorContentChanges: jest.fn(),
  };

  // Provide a mock implementation for the useLatexContext hook
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => children, // Simple passthrough implementation
    useLatexContext: () => mockContextValue,
  };
});

// Mock the components that App uses
jest.mock("./components/LatexEditor", () => ({
  __esModule: true,
  default: ({ value, onChange, onEditorDidMount }: any) => (
    <div data-testid="latex-editor">
      <textarea
        data-testid="editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        data-testid="mock-editor-mount"
        onClick={() =>
          onEditorDidMount({
            onDidChangeCursorPosition: jest.fn().mockImplementation((cb) => {
              // Immediately call the callback with a position that will result in offset 5
              cb({
                position: {
                  lineNumber: 1,
                  column: 5,
                },
              });
              return { dispose: jest.fn() };
            }),
            getModel: jest.fn().mockReturnValue({
              getOffsetAt: jest.fn().mockReturnValue(5),
            }),
          })
        }
      >
        Mount Editor
      </button>
    </div>
  ),
}));

jest.mock("./components/LatexPreview", () => ({
  __esModule: true,
  default: ({ content }: any) => (
    <div data-testid="latex-preview">
      {content && (
        <p data-testid="preview-content">{content.substring(0, 20)}...</p>
      )}
    </div>
  ),
}));

jest.mock("./components/AIChat", () => ({
  __esModule: true,
  default: ({ onClose }: any) => (
    <div data-testid="ai-chat">
      <button data-testid="close-chat" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

describe("App", () => {
  it("renders the application with editor and preview", () => {
    render(<App />);
    expect(screen.getByTestId("latex-editor")).toBeInTheDocument();
    expect(screen.getByTestId("latex-preview")).toBeInTheDocument();
  });

  it("toggles dark mode when the button is clicked", () => {
    render(<App />);
    const darkModeButton = screen.getByText(/Dark/i);

    // Initial state should be light mode
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // Click dark mode button
    fireEvent.click(darkModeButton);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByText(/Light/i)).toBeInTheDocument();

    // Click to switch back to light mode
    fireEvent.click(screen.getByText(/Light/i));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles chat panel when chat button is clicked", () => {
    render(<App />);
    const chatButton = screen.getByText(/Chat/i);

    // Chat should be open initially
    expect(screen.getByTestId("ai-chat")).toBeInTheDocument();

    // Close chat
    fireEvent.click(chatButton);
    expect(screen.queryByTestId("ai-chat")).not.toBeInTheDocument();

    // Open chat again
    fireEvent.click(chatButton);
    expect(screen.getByTestId("ai-chat")).toBeInTheDocument();
  });
});
