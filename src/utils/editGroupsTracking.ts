import * as monaco from "monaco-editor";

// Time window for grouping edit operations (ms)
export const EDIT_GROUPING_THRESHOLD = 1000;

// Interface for tracking edit operations
export interface EditOperation {
  type: "insert" | "delete" | "replace";
  range: monaco.IRange;
  text: string;
  deletedText: string;
  timestamp: number;
}

// Interface for grouped edits
export interface EditGroup {
  operations: EditOperation[];
  type: "insertion" | "deletion" | "replacement";
  startTime: number;
  endTime: number;
  insertedText: string; // Net text inserted
  deletedText: string; // Net text deleted
}

/**
 * Class that manages tracking and organizing edit operations
 */
export class EditTracker {
  private editGroups: EditGroup[] = [];
  private previousModelContent: string = "";
  private editor: monaco.editor.IStandaloneCodeEditor;
  private maxHistorySize: number = 20;

  /**
   * Create a new EditTracker
   * @param editor The Monaco editor to track
   */
  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    // Initialize previous content
    if (editor.getModel()) {
      this.previousModelContent = editor.getModel()!.getValue();
    }
  }

  /**
   * Process editor content changes to create and update edit operations and groups
   * @param event Monaco content changed event
   */
  public processEditorContentChanges(
    event: monaco.editor.IModelContentChangedEvent
  ): void {
    const model = this.editor.getModel();
    if (!model) return;

    const currentContent = model.getValue();
    const currentTime = Date.now();

    const mostRecentEditGroup: EditGroup | undefined = this.editGroups[this.editGroups.length - 1];
    let lastOperation: EditOperation | undefined = mostRecentEditGroup?.operations[mostRecentEditGroup?.operations.length - 1];

    // Process each change
    event.changes.forEach((change) => {
      const isDelete = change.text === "" && change.rangeLength > 0;
      const isInsert = change.text !== "" && change.rangeLength === 0;
      const isReplace = change.text !== "" && change.rangeLength > 0;

      // Compute the deleted text
      let deletedText = "";
      if (isDelete || isReplace) {
        deletedText = this.extractTextFromRange(
          change.range,
          this.previousModelContent
        );
      }

      // Create the operation
      const op: EditOperation = {
        type: isDelete ? "delete" : isInsert ? "insert" : "replace",
        range: { ...change.range },
        text: change.text,
        deletedText,
        timestamp: currentTime,
      };

      console.log("[Edit Group Tracking] change: ", change);
      console.log("[Edit Group Tracking] op: ", op);

      if (!lastOperation) {
        // No last operation, create a new group
        const newGroup = this.createEditGroup([op]);
        this.editGroups.push(newGroup);
        return;
      }
      const timeSinceLastOperation = op.timestamp - lastOperation.timestamp;
      if (timeSinceLastOperation <= EDIT_GROUPING_THRESHOLD && this.areAdjacentOperations(op, lastOperation)) {
        // Still within time threshold and operations are adjacent, add to the most recent group
        const updatedOperations = [
          ...mostRecentEditGroup.operations,
          op,
        ];
        // Remove the last group
        this.editGroups.pop();
        // Create a new group with the updated operations
        const updatedGroup = this.createEditGroup(updatedOperations);
        // Add the updated group back
        this.editGroups.push(updatedGroup);
      } else {
        // Time threshold exceeded or operations are not adjacent, create a new group
        const newGroup = this.createEditGroup([op]);
        this.editGroups.push(newGroup);
      }
      lastOperation = op;
    });

    // Limit history to last N groups to avoid memory issues
    if (this.editGroups.length > this.maxHistorySize) {
      this.editGroups = this.editGroups.slice(-this.maxHistorySize);
    }

    // Update previous content
    this.previousModelContent = currentContent;
  }

  /**
   * Helper function to extract text from a range in the previous content
   */
  private extractTextFromRange(range: monaco.IRange, content: string): string {
    try {
      const model = this.editor.getModel();
      if (!model) return "";

      // We need to convert the range to positions in the previous content
      // For simplicity, we'll extract line by line
      const lines = content.split("\n");

      // Check if range is valid for the content
      if (
        range.startLineNumber > lines.length ||
        range.endLineNumber > lines.length
      ) {
        return "";
      }

      let result = "";
      for (
        let lineNumber = range.startLineNumber;
        lineNumber <= range.endLineNumber;
        lineNumber++
      ) {
        const line = lines[lineNumber - 1]; // -1 because lineNumber is 1-indexed

        if (
          lineNumber === range.startLineNumber &&
          lineNumber === range.endLineNumber
        ) {
          // Single line case
          const startCol = Math.min(range.startColumn - 1, line.length);
          const endCol = Math.min(range.endColumn - 1, line.length);
          result += line.substring(startCol, endCol);
        } else if (lineNumber === range.startLineNumber) {
          // First line of multi-line
          const startCol = Math.min(range.startColumn - 1, line.length);
          result += line.substring(startCol) + "\n";
        } else if (lineNumber === range.endLineNumber) {
          // Last line of multi-line
          const endCol = Math.min(range.endColumn - 1, line.length);
          result += line.substring(0, endCol);
        } else {
          // Middle line
          result += line + "\n";
        }
      }

      return result;
    } catch (e) {
      console.error("[ChangeTracking] Error extracting text from range:", e);
      return "";
    }
  }

  /**
   * Check if operations are adjacent in the document
   */
  private areAdjacentOperations(a: EditOperation, b: EditOperation): boolean {
    // Check if operations are on same line or adjacent lines
    if (Math.abs(a.range.startLineNumber - b.range.startLineNumber) > 1) {
      return false;
    }

    // If they're on the same line, check column proximity
    if (a.range.startLineNumber === b.range.startLineNumber) {
      // Consider operations within 20 columns as adjacent
      return (
        Math.abs(a.range.startColumn - b.range.endColumn) <= 20 ||
        Math.abs(b.range.startColumn - a.range.endColumn) <= 20
      );
    }

    return true; // Adjacent lines
  }

  /**
   * Create an edit group from operations
   */
  private createEditGroup(operations: EditOperation[]): EditGroup {
    // Sort operations by timestamp to ensure correct order
    const sortedOps = [...operations].sort((a, b) => a.timestamp - b.timestamp);

    // Determine original content and final content in the affected region
    let originalContent = "";
    let finalContent = "";

    // Simulate the edit process to determine original and final content
    let documentState = ""; // Simulate document state
    let deletionStack: { text: string; position: number }[] = []; // Track deletions with positions

    // Extract original text from the first operation's range
    // This is approximate but gives us a starting point
    if (sortedOps.length > 0) {
      // Get original content from first operation
      const firstOp = sortedOps[0];
      if (firstOp.type === "delete" || firstOp.type === "replace") {
        // Original content includes what was deleted in first operation
        originalContent = firstOp.deletedText;
      }

      // Now simulate each operation to track document changes
      for (const op of sortedOps) {
        if (op.type === "insert") {
          // Content is being added
          documentState += op.text;
        } else if (op.type === "delete") {
          // Content is being removed - check if it matches our running state
          if (documentState.endsWith(op.deletedText)) {
            // Deleting something we just added - internal correction
            documentState = documentState.substring(
              0,
              documentState.length - op.deletedText.length
            );
          } else {
            // Deleting original content - push to stack with position information
            deletionStack.push({
              text: op.deletedText,
              position: op.range.startColumn,
            });
          }
        } else if (op.type === "replace") {
          // Replace is delete + insert
          if (documentState.endsWith(op.deletedText)) {
            // Replacing something we just added
            documentState = documentState.substring(
              0,
              documentState.length - op.deletedText.length
            );
          } else {
            // Replacing original content - push to stack with position
            deletionStack.push({
              text: op.deletedText,
              position: op.range.startColumn,
            });
          }
          documentState += op.text;
        }
      }

      // Process deletion stack to reconstruct the original text in correct order
      if (deletionStack.length > 0) {
        // Sort deletions by position in ascending order (left to right)
        deletionStack.sort((a, b) => a.position - b.position);

        // Extract just the text from the ordered stack
        const orderedDeletedText = deletionStack
          .map((item) => item.text)
          .join("");

        // If we have deletion stack content, use it for original content
        if (
          orderedDeletedText &&
          !originalContent.includes(orderedDeletedText)
        ) {
          originalContent = orderedDeletedText;
        }
      }

      // Final content is the document state after all operations
      finalContent = documentState;
    }

    // Calculate net insertions and deletions by comparing original and final content
    let netInsertedText = "";
    let netDeletedText = "";

    // If original content was completely deleted and something new was added
    if (originalContent !== "" && finalContent !== "") {
      // Some text was both removed and added - this is a replacement
      netDeletedText = originalContent;
      netInsertedText = finalContent;
    } else if (originalContent !== "" && finalContent === "") {
      // Something was deleted and nothing was added - this is a deletion
      netDeletedText = originalContent;
      netInsertedText = "";
    } else if (originalContent === "" && finalContent !== "") {
      // Nothing was deleted but something was added - this is an insertion
      netDeletedText = "";
      netInsertedText = finalContent;
    }

    // Determine type based on net effect
    let groupType: "insertion" | "deletion" | "replacement";

    if (netDeletedText !== "" && netInsertedText !== "") {
      groupType = "replacement";
    } else if (netDeletedText !== "") {
      groupType = "deletion";
    } else {
      groupType = "insertion";
    }

    return {
      operations: sortedOps,
      type: groupType,
      startTime: sortedOps[0].timestamp,
      endTime: sortedOps[sortedOps.length - 1].timestamp,
      insertedText: netInsertedText,
      deletedText: netDeletedText,
    };
  }

  /**
   * Get the current edit groups
   */
  public getEditGroups(): EditGroup[] {
    return this.editGroups;
  }

  /**
   * Get the most recent edit group if it exists
   */
  public getMostRecentEditGroup(): EditGroup | null {
    if (this.editGroups.length === 0) return null;
    return this.editGroups[this.editGroups.length - 1];
  }

  /**
   * Get the previous content
   */
  public getPreviousContent(): string {
    return this.previousModelContent;
  }

  /**
   * Set the maximum history size
   */
  public setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    // Trim history if needed
    if (this.editGroups.length > this.maxHistorySize) {
      this.editGroups = this.editGroups.slice(-this.maxHistorySize);
    }
  }

  /**
   * Clear all edit history
   */
  public clearHistory(): void {
    this.editGroups = [];
    // Keep previous content as is
  }

  /**
   * Get a summary of recent changes
   */
  public getRecentChangesSummary(): {
    type: "insertion" | "deletion" | "replacement";
    insertedText: string;
    deletedText: string;
    timeElapsed: number;
  }[] {
    return this.editGroups.map((group) => ({
      type: group.type,
      insertedText: group.insertedText,
      deletedText: group.deletedText,
      timeElapsed: Date.now() - group.endTime,
    }));
  }
}
