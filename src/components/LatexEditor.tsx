import React, { useCallback, useEffect, useState } from "react";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { initializeMonaco } from "../utils/monacoConfig";
import InlineAIEdit from "./InlineAIEdit";

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  onEditorDidMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  readOnly?: boolean;
  showToolbar?: boolean;
  wordWrap?: boolean;
  fontSize?: number;
}

const LatexEditor: React.FC<LatexEditorProps> = ({
  value,
  onChange,
  height = "100%",
  onEditorDidMount,
  readOnly = false,
  showToolbar = true,
  wordWrap = true,
  fontSize = 12,
}) => {
  const [editorInstance, setEditorInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    initializeMonaco();

    // Check if dark mode is enabled
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    // Initial check
    checkDarkMode();

    // Create a mutation observer to monitor class changes on html
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          checkDarkMode();
        }
      });
    });

    // Start observing
    observer.observe(document.documentElement, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      // Store editor instance
      setEditorInstance(editor);

      // Add LaTeX-specific editor features
      editor.getModel()?.updateOptions({
        tabSize: 4,
        insertSpaces: true,
      });

      // Set read-only mode if specified
      if (readOnly) {
        editor.updateOptions({
          readOnly: true,
          renderLineHighlight: "none",
        });
      }

      // Call the parent's onEditorDidMount if provided
      if (onEditorDidMount) {
        onEditorDidMount(editor);
      }
    },
    [onEditorDidMount, readOnly]
  );

  const toggleAI = () => {
    setAiEnabled(!aiEnabled);
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${
        readOnly ? "latex-editor-readonly" : ""
      }`}
    >
      {showToolbar && (
        <div
          className="flex items-center p-1 bg-neutral-100 border-b flex-shrink-0 dark:bg-[#202020] dark:border-neutral-700"
          style={{ height: "32px" }}
        >
          <button
            className={`px-2 py-1 text-xs rounded flex-shrink-0 flex items-center ${
              aiEnabled
                ? "bg-blue-500 text-white dark:bg-neutral-600"
                : "bg-neutral-300 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-300"
            }`}
            onClick={toggleAI}
            title={
              aiEnabled ? "Disable AI suggestions" : "Enable AI suggestions"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1 flex-shrink-0"
            >
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"></path>
              <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path>
            </svg>
            <span className="whitespace-nowrap">
              {aiEnabled ? "AI On (GPT-4o)" : "AI Off"}
            </span>
          </button>
          <div className="ml-2 text-xs text-neutral-500 truncate flex-shrink min-w-0 dark:text-neutral-400">
            <span className="hidden sm:inline whitespace-nowrap">Press </span>
            <kbd className="px-1 py-0.5 text-xs border border-neutral-300 rounded bg-neutral-50 inline-flex items-center justify-center flex-shrink-0 mx-0.5 dark:bg-[#252525] dark:border-neutral-600 dark:text-neutral-300">
              Tab
            </kbd>
            <span className="hidden sm:inline whitespace-nowrap">
              {" "}
              to accept suggestions
            </span>
          </div>
        </div>
      )}
      <div
        className="flex-grow relative min-h-0"
        style={{ height: readOnly ? "auto" : "0" }}
      >
        <Editor
          height={height}
          defaultLanguage="latex"
          theme={isDarkMode ? "vs-dark" : "latexTheme"}
          value={value}
          onChange={(value) => onChange(value || "")}
          onMount={handleEditorDidMount}
          options={{
            fontSize: fontSize,
            lineNumbers: readOnly ? "off" : "on",
            roundedSelection: false,
            scrollBeyondLastLine: !readOnly,
            readOnly: readOnly,
            automaticLayout: true,
            wordWrap: wordWrap ? "on" : "off",
            minimap: {
              enabled: !readOnly,
            },
            suggestOnTriggerCharacters: !readOnly,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            wordBasedSuggestions: "off",
            parameterHints: {
              enabled: !readOnly,
            },
            lineDecorationsWidth: readOnly ? 0 : 5,
            lineNumbersMinChars: readOnly ? 0 : 1,
            glyphMargin: !readOnly,
            folding: !readOnly,
            domReadOnly: readOnly,
            cursorStyle: readOnly ? "block" : "line",
            cursorBlinking: readOnly ? "solid" : "blink",
            scrollbar: {
              vertical: readOnly ? "hidden" : "auto",
              horizontal: "auto",
              useShadows: !readOnly,
              verticalHasArrows: !readOnly,
              horizontalHasArrows: !readOnly,
              alwaysConsumeMouseWheel: !readOnly,
            },
            overviewRulerBorder: !readOnly,
            renderLineHighlight: readOnly ? "none" : "all",
            renderWhitespace: readOnly ? "none" : "none",
            renderControlCharacters: !readOnly,
            fixedOverflowWidgets: true,
            experimentalInlineEdit: {
              enabled: true,
              showToolbar: "always",
            },
          }}
        />
      </div>
      {aiEnabled && !readOnly && <InlineAIEdit editor={editorInstance} />}
    </div>
  );
};

export default LatexEditor;
