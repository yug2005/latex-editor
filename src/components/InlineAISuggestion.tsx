import React, { useState, useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { getLatexSuggestions } from "../services/aiService";
import { loader } from "@monaco-editor/react";
import { EditTracker } from "../utils/editGroupsTracking";

interface InlineAISuggestionProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
}

// Delay before triggering suggestions (ms)
const SUGGESTION_DELAY = 1000;

/**
 * Component that adds AI inline suggestion functionality to Monaco editor
 */
const InlineAISuggestion: React.FC<InlineAISuggestionProps> = ({ editor }) => {
  const [suggestionType, setSuggestionType] = useState<
    "command" | "math" | "environment" | "prose"
  >("prose");
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
          monaco.languages.registerInlineCompletionsProvider("latex", {
            provideInlineCompletions: async (
              model,
              position,
              context,
              token
            ) => {
              if (context.triggerKind === 0) {
                // This is an auto trigger, so we don't want to show suggestions
                console.log("[InlineAISuggestion] Skipping - auto trigger");
                return { items: [] };
              }

              if (!pendingSuggestionRef.current) {
                return { items: [] };
              }

              const suggestion = pendingSuggestionRef.current;

              const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column,
              };

              return Promise.resolve({
                items: [
                  {
                    insertText: suggestion,
                    range: range,
                  },
                ],
              });
            },
            freeInlineCompletions: (args) => {},
          });
      } catch (err) {
        console.error(
          "[InlineAISuggestion] Failed to register inline completions provider:",
          err
        );
      }
    });

    // Trigger inline suggestions
    const triggerInlineSuggestions = () => {
      if (!editor || !pendingSuggestionRef.current) return;
      editor.trigger("", "editor.action.inlineSuggest.trigger", {});
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

        // Skip if cursor is in the middle of a word
        if (isInMiddleOfWord) {
          console.log(
            "[InlineAISuggestion] Skipping - cursor in middle of word"
          );
          return;
        }

        // Skip comments
        if (prefix.trimStart().startsWith("%")) {
          console.log("[InlineAISuggestion] Skipping - comment line");
          return;
        }

        // Get recent changes from the EditTracker
        const recentChanges = editTrackerRef.current.getRecentChangesSummary();

        const suggestion = await getLatexSuggestions({
          documentContent,
          cursorPosition: cursorOffset,
          prefix,
          // We'll pass recentChanges in a comment for now until the API supports it
          // When API supports it, uncomment this line and pass the actual changes
          // recentChanges
        });

        if (suggestion && suggestion.length > 0) {
          // Set the suggestion type (for potential styling)
          if (prefix.includes("\\") && !prefix.includes("{")) {
            setSuggestionType("command");
          } else if (
            prefix.includes("$") ||
            prefix.includes("\\begin{equation}") ||
            prefix.includes("\\begin{align}")
          ) {
            setSuggestionType("math");
          } else if (prefix.includes("\\begin{")) {
            setSuggestionType("environment");
          } else {
            setSuggestionType("prose");
          }

          // Store and show the suggestion
          pendingSuggestionRef.current = suggestion;
          triggerInlineSuggestions();
        }
      } catch (error) {
        console.error(
          "[InlineAISuggestion] Error updating suggestions:",
          error
        );
      } finally {
        isFetchingSuggestion = false;
      }
    };

    // Set up event handlers
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
            insertedText:
              group.insertedText.length > 50
                ? `${group.insertedText.substring(0, 50)}... (${
                    group.insertedText.length
                  } chars)`
                : group.insertedText,
            deletedText:
              group.deletedText.length > 50
                ? `${group.deletedText.substring(0, 50)}... (${
                    group.deletedText.length
                  } chars)`
                : group.deletedText,
            operations: group.operations.length,
            duration: group.endTime - group.startTime,
          }))
        );
      }

      // Handle suggestions
      if (suggestionTimer) clearTimeout(suggestionTimer);
      editor.trigger("", "editor.action.inlineSuggest.hide", {});
      suggestionTimer = setTimeout(updateAISuggestions, SUGGESTION_DELAY);
    };

    const onDidChangeCursorPosition = () => {
      if (suggestionTimer) clearTimeout(suggestionTimer);
      editor.trigger("", "editor.action.inlineSuggest.hide", {});
      suggestionTimer = setTimeout(updateAISuggestions, SUGGESTION_DELAY);
    };

    // Register event handlers
    const contentDisposable = editor.onDidChangeModelContent(
      onDidChangeModelContent
    );
    const cursorDisposable = editor.onDidChangeCursorPosition(
      onDidChangeCursorPosition
    );

    return () => {
      // Clean up
      contentDisposable.dispose();
      cursorDisposable.dispose();
      if (inlineCompletionsProviderRef.current) {
        inlineCompletionsProviderRef.current.dispose();
      }
      if (suggestionTimer) {
        clearTimeout(suggestionTimer);
      }
      // EditTracker doesn't need cleanup
    };
  }, [editor, suggestionType]);

  return null; // No UI
};

export default InlineAISuggestion;
