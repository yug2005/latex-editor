import React, { useCallback, useEffect, useState } from "react";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { initializeMonaco } from "../utils/monacoConfig";
import InlineAISuggestion from "./InlineAISuggestion";

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

const LatexEditor: React.FC<LatexEditorProps> = ({ value, onChange }) => {
  const [editorInstance, setEditorInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);

  useEffect(() => {
    initializeMonaco();
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
    },
    []
  );

  const toggleAI = () => {
    setAiEnabled(!aiEnabled);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-1 bg-gray-100 border-b h-8 overflow-hidden">
        <button
          className={`px-2 py-1 text-xs rounded flex-shrink-0 flex items-center ${
            aiEnabled ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-700"
          }`}
          onClick={toggleAI}
          title={aiEnabled ? "Disable AI suggestions" : "Enable AI suggestions"}
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
        <div className="ml-2 text-xs text-gray-500 truncate flex-shrink min-w-0">
          <span className="hidden sm:inline whitespace-nowrap">Press </span>
          <kbd className="px-1 py-0.5 text-xs border border-gray-300 rounded bg-gray-50 inline-flex items-center justify-center flex-shrink-0 mx-0.5">
            Tab
          </kbd>
          <span className="hidden sm:inline whitespace-nowrap">
            {" "}
            to accept suggestions
          </span>
        </div>
      </div>
      <div className="flex-grow relative">
        <Editor
          height={"100%"}
          defaultLanguage="latex"
          theme="latexTheme"
          value={value}
          onChange={(value) => onChange(value || "")}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            wordWrap: "on",
            minimap: {
              enabled: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            wordBasedSuggestions: "off",
            parameterHints: {
              enabled: true,
            },
          }}
        />
      </div>
      {aiEnabled && <InlineAISuggestion editor={editorInstance} />}
    </div>
  );
};

export default LatexEditor;
