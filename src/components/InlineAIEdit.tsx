import { useEffect, useRef, useCallback } from "react";
import * as monaco from "monaco-editor";
import { getLatexSuggestions } from "../services/aiService";
import { loader } from "@monaco-editor/react";
import { useLatexContext } from "./LatexContextSystem";

interface InlineAIEditProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
}

// Delay before triggering suggestions (ms)
const SUGGESTION_DELAY = 500;

/**
 * Component that adds AI inline suggestion functionality to Monaco editor
 */
const InlineAIEdit = ({ editor }: InlineAIEditProps) => {
  const pendingSuggestionRef = useRef<string | null>(null);
  const inlineCompletionsProviderRef = useRef<monaco.IDisposable | null>(null);
  const suggestionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingSuggestionRef = useRef<boolean>(false);

  const latexContext = useLatexContext();

  // Store latexContext methods in refs to avoid dependency issues
  const latexContextRef = useRef(latexContext);

  // Update the ref when latexContext changes
  useEffect(() => {
    latexContextRef.current = latexContext;
  }, [latexContext]);

  const rejectInlineEdit = () => {
    editor?.trigger("", "editor.action.inlineEdit.reject", {});
  };

  // Trigger inline suggestions
  const triggerInlineEdit = () => {
    console.log("[InlineAIEdit] Triggering inline edit");
    editor?.trigger("", "editor.action.inlineEdit.trigger", {});
  };

  // Fetch and show AI suggestions
  const updateAISuggestions = useCallback(async () => {
    if (!editor || isFetchingSuggestionRef.current) return;

    isFetchingSuggestionRef.current = true;
    try {
      const documentContent = latexContextRef.current.getCurrentDocument();
      const documentAST = latexContextRef.current.getCurrentDocumentAST();
      const currentNode = latexContextRef.current.getCurrentNode();
      const cursorInfo = latexContextRef.current.getCurrentCursorInfo();
      if (!documentContent || !documentAST || !currentNode || !cursorInfo) return;
      if (currentNode.kind === "text.string") {
        console.log("[InlineAIEdit] Current node is a text string, skipping");
        return;
      }

      const cursorOffset = cursorInfo.offset;
      const lineContent = cursorInfo.lineContent;
      const prefix = lineContent.substring(0, cursorInfo.position.column - 1);
      const visibleRangeInfo = latexContextRef.current.getVisibleRangeInfo();
      const visibleContent = visibleRangeInfo?.content;
      const recentEdits = latexContextRef.current.getRecentEditsSummary();
      const currentWord = cursorInfo.wordAtPosition;

      console.log("[InlineAIEdit] Cursor info:", cursorInfo);
      console.log("[InlineAIEdit] Visible range info:", visibleRangeInfo);
      console.log("[InlineAIEdit] Recent edits:", recentEdits);

      const start = new Date();
      const suggestion = await getLatexSuggestions({
        context: {
          currentNode,
          documentAST,
          documentContent,
          cursorOffset,
          prefix,
          visibleContent,
          recentEdits,
          currentWord,
        },
      });
      const elapsedTime = new Date().getTime() - start.getTime();
      console.log(`[InlineAIEdit] Suggestion took ${elapsedTime}ms`);

      if (suggestion && suggestion.length > 0) {
        pendingSuggestionRef.current = suggestion;
        triggerInlineEdit();
      }
    } catch (error) {
      console.error("[InlineAIEdit] Error updating suggestions:", error);
    } finally {
      isFetchingSuggestionRef.current = false;
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    // Register inline completions provider using loader
    loader.init().then((monaco) => {
      try {
        inlineCompletionsProviderRef.current =
          monaco.languages.registerInlineEditProvider("latex", {
            provideInlineEdit: (model, context, token) => {
              if (
                context.triggerKind ===
                monaco.languages.InlineEditTriggerKind.Automatic
              ) {
                return null;
              }
              const position = editor.getPosition();
              if (!position || !pendingSuggestionRef.current) {
                return null;
              }
              const suggestion = pendingSuggestionRef.current;
              return {
                text: suggestion,
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column,
                },
              };
            },
            freeInlineEdit: () => {},
          });
      } catch {
        console.error("[InlineAIEdit] Failed to register inline edit provider");
      }
    });

    const onDidChangeModelContent = (
      event: monaco.editor.IModelContentChangedEvent
    ) => {
      latexContextRef.current.updateVisibleRange();
      latexContextRef.current.updateDocumentAST();
      latexContextRef.current.processEditorContentChanges(event);
    };

    const onDidChangeCursorPosition = () => {
      rejectInlineEdit();
      latexContextRef.current.updateCursorInfo();
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
      suggestionTimerRef.current = setTimeout(
        updateAISuggestions,
        SUGGESTION_DELAY
      );
    };

    const onDidScrollChange = () => {
      latexContextRef.current.updateVisibleRange();
    };

    const contentDisposable = editor.onDidChangeModelContent(
      onDidChangeModelContent
    );
    const cursorDisposable = editor.onDidChangeCursorPosition(
      onDidChangeCursorPosition
    );
    const scrollDisposable = editor.onDidScrollChange(onDidScrollChange);

    return () => {
      contentDisposable.dispose();
      cursorDisposable.dispose();
      scrollDisposable.dispose();
      if (inlineCompletionsProviderRef.current) {
        inlineCompletionsProviderRef.current.dispose();
      }
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    };
  }, [editor, updateAISuggestions]);

  return null;
};

export default InlineAIEdit;
