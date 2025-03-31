import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

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
  default: ({ onClose, editorContent, cursorPosition }: any) => (
    <div data-testid="ai-chat">
      <p data-testid="cursor-position">Cursor: {cursorPosition}</p>
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

  it("updates cursor position when editor is mounted", () => {
    render(<App />);

    // Trigger the onEditorDidMount callback
    fireEvent.click(screen.getByTestId("mock-editor-mount"));

    // Check if cursor position is updated
    expect(screen.getByTestId("cursor-position")).toHaveTextContent(
      "Cursor: 5"
    );
  });
});
