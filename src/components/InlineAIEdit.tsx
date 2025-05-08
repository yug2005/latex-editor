import React, { useState, useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { getLatexSuggestions } from "../services/aiService";
import { loader } from "@monaco-editor/react";
import { EditTracker } from "../utils/editGroupsTracking";

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

  // Use a ref for the EditTracker so it persists between renders
  const editTrackerRef = useRef<EditTracker | null>(null);

  useEffect(() => {
    if (!editor) return;

    // Initialize the EditTracker if it doesn't exist
    if (!editTrackerRef.current) {
      editTrackerRef.current = new EditTracker(editor);
    }

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
      if (!editor || isFetchingSuggestion || !editTrackerRef.current) return;

      isFetchingSuggestion = true;
      try {
        const position = editor.getPosition();
        if (!position) return;

        const model = editor.getModel();
        if (!model) return;

        // Get current content and context
        const documentContent = model.getValue();
        const cursorOffset = model.getOffsetAt(position);
        const lineContent = model.getLineContent(position.lineNumber);
        const prefix = lineContent.substring(0, position.column - 1);

        // Check if cursor is in the middle of a word
        const isInMiddleOfWord = (() => {
          if (position.column <= 1 || position.column > lineContent.length)
            return false;
          const charBefore = lineContent[position.column - 2]; // -2 because column is 1-indexed
          const charAfter = lineContent[position.column - 1]; // -1 for the same reason
          return /\w/.test(charBefore) && /\w/.test(charAfter);
        })();

        if (isInMiddleOfWord) {
          console.log("[InlineAIEdit] Skipping - cursor in middle of word");
          return;
        }
        if (prefix.trimStart().startsWith("%")) {
          console.log("[InlineAIEdit] Skipping - comment line");
          return;
        }

        // Get recent changes from the EditTracker
        const recentChanges = editTrackerRef.current.getRecentChangesSummary();

        const start = new Date();
        const suggestion = await getLatexSuggestions({
          documentContent,
          cursorPosition: cursorOffset,
          prefix,
          // We'll pass recentChanges in a comment for now until the API supports it
          // When API supports it, uncomment this line and pass the actual changes
          // recentChanges
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

    const onDidChangeModelContent = (
      event: monaco.editor.IModelContentChangedEvent
    ) => {
      // Process edit operations and update edit groups using the EditTracker
      if (editTrackerRef.current) {
        editTrackerRef.current.processEditorContentChanges(event);

        // Log edit groups for testing
        console.log(
          "[ChangeTracking] Current edit groups:",
          editTrackerRef.current.getEditGroups().map((group) => ({
            type: group.type,
            insertedText: group.insertedText,
            deletedText: group.deletedText,
            operations: group.operations.length,
            duration: group.endTime - group.startTime,
          }))
        );
      }

      if (suggestionTimer) clearTimeout(suggestionTimer);
      suggestionTimer = setTimeout(updateAISuggestions, SUGGESTION_DELAY);
    };

    const onDidChangeCursorPosition = () => {
      if (suggestionTimer) clearTimeout(suggestionTimer);
      suggestionTimer = setTimeout(updateAISuggestions, SUGGESTION_DELAY);
    };

    const contentDisposable = editor.onDidChangeModelContent(
      onDidChangeModelContent
    );
    const cursorDisposable = editor.onDidChangeCursorPosition(
      onDidChangeCursorPosition
    );

    return () => {
      contentDisposable.dispose();
      cursorDisposable.dispose();
      if (inlineCompletionsProviderRef.current) {
        inlineCompletionsProviderRef.current.dispose();
      }
      if (suggestionTimer) {
        clearTimeout(suggestionTimer);
      }
    };
  }, [editor]);

  return null;
};

export default InlineAIEdit;
