import React, { useCallback, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { initializeMonaco } from "../utils/monacoConfig";

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

const LatexEditor: React.FC<LatexEditorProps> = ({
  value,
  onChange,
  height = "90vh",
}) => {
  useEffect(() => {
    initializeMonaco();
  }, []);

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      // Add LaTeX-specific editor features
      editor.getModel()?.updateOptions({
        tabSize: 4,
        insertSpaces: true,
      });
    },
    []
  );

  return (
    <Editor
      height={height}
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
  );
};

export default LatexEditor;
