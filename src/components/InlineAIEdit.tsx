import React, { useState, useEffect, useRef } from "react";
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

  // Use the Latex Context
  const latexContext = useLatexContext();

  useEffect(() => {
    if (!editor) return;

    // Track when to fetch suggestions to avoid too many API calls
    let suggestionTimer: NodeJS.Timeout | null = null;
    let isFetchingSuggestion = false;

    // Register inline completions provider using loader
    loader.init().then((monaco) => {
      try {
        inlineCompletionsProviderRef.current =
          monaco.languages.registerInlineEditProvider("latex", {
            provideInlineEdit: (model, context, token) => {
              if (context.triggerKind === 1) {
                console.log("[InlineAIEdit] Skipping - auto trigger");
                return null;
              }
              if (!pendingSuggestionRef.current) {
                return null;
              }
              const suggestion = pendingSuggestionRef.current;
              const position = editor.getPosition();
              if (!position) return null;
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
      } catch (err) {
        console.error(
          "[InlineAIEdit] Failed to register inline edit provider:",
          err
        );
      }
    });

    // Trigger inline suggestions
    const triggerInlineEdit = () => {
      if (!editor || !pendingSuggestionRef.current) return;
      console.log("[InlineAIEdit] Triggering inline edit");
      editor.trigger("", "editor.action.inlineEdit.reject", {});
      editor.trigger("", "editor.action.inlineEdit.trigger", {});
    };

    // Fetch and show AI suggestions
    const updateAISuggestions = async () => {
      if (!editor || isFetchingSuggestion) return;
      isFetchingSuggestion = true;
      try {
        // Get context information from LatexContext
        const cursorInfo = latexContext.getCurrentCursorInfo();
        const visibleRangeInfo = latexContext.getVisibleRangeInfo();
        const recentEdits = latexContext.getRecentEditsSummary();

        // Skip if essential cursor info is missing
        if (!cursorInfo || !cursorInfo.position) return;

        const model = editor.getModel();
        if (!model) return;

        // Get document content and cursor position from model
        const documentContent = model.getValue();
        const cursorOffset = cursorInfo.offset;
        const lineContent = cursorInfo.lineContent;
        const prefix = lineContent.substring(0, cursorInfo.position.column - 1);

        console.log("[InlineAIEdit] Context for suggestion:", {
          cursorPosition: cursorOffset,
          visibleRange: visibleRangeInfo
            ? `${visibleRangeInfo.startLineNumber}-${visibleRangeInfo.endLineNumber}`
            : "none",
          hasRecentEdits: recentEdits ? true : false,
        });

        const start = new Date();
        const suggestion = await getLatexSuggestions({
          documentContent,
          cursorPosition: cursorOffset,
          prefix,
          contextInfo: {
            visibleContent: visibleRangeInfo?.content,
            recentEdits: recentEdits,
            currentWord: cursorInfo.wordAtPosition || undefined,
          },
        });
        console.log(
          `[InlineAIEdit] Suggestion took ${
            new Date().getTime() - start.getTime()
          }ms`
        );

        if (suggestion && suggestion.length > 0) {
          // Store and show the suggestion
          pendingSuggestionRef.current = suggestion;
          triggerInlineEdit();
        }
      } catch (error) {
        console.error("[InlineAIEdit] Error updating suggestions:", error);
      } finally {
        isFetchingSuggestion = false;
      }
    };

    // Set up event listeners that will update the context
    const onDidChangeCursorPosition = () => {
      // Update cursor info in the context
      latexContext.updateCursorInfo();

      // Schedule suggestion update
      if (suggestionTimer) clearTimeout(suggestionTimer);
      suggestionTimer = setTimeout(updateAISuggestions, SUGGESTION_DELAY);
    };

    // Listen for scroll events to update visible range
    const onDidScrollChange = () => {
      latexContext.updateVisibleRange();
    };

    // Listen for content changes
    const onDidChangeModelContent = (
      event: monaco.editor.IModelContentChangedEvent
    ) => {
      // Process content changes for tracking edits
      latexContext.processEditorContentChanges(event);

      // Update cursor and visible range info
      latexContext.updateCursorInfo();
      latexContext.updateVisibleRange();

      // Schedule suggestion update
      if (suggestionTimer) clearTimeout(suggestionTimer);
      suggestionTimer = setTimeout(updateAISuggestions, SUGGESTION_DELAY);
    };

    const cursorDisposable = editor.onDidChangeCursorPosition(
      onDidChangeCursorPosition
    );
    const scrollDisposable = editor.onDidScrollChange(onDidScrollChange);
    const contentDisposable = editor.onDidChangeModelContent(
      onDidChangeModelContent
    );

    return () => {
      // Clean up all event listeners
      cursorDisposable.dispose();
      scrollDisposable.dispose();
      contentDisposable.dispose();
      if (inlineCompletionsProviderRef.current) {
        inlineCompletionsProviderRef.current.dispose();
      }
      if (suggestionTimer) {
        clearTimeout(suggestionTimer);
      }
    };
  }, [editor, latexContext]);

  return null;
};

export default InlineAIEdit;
