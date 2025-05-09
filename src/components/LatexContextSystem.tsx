import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useRef,
  useEffect,
} from "react";
import * as monaco from "monaco-editor";
import { latexParser } from "latex-utensils";
import { LatexNode, parseLatex } from "../utils/latexAST";
import { EditChange, EditTracker } from "../utils/editGroupsTracking";

// Structure for cursor information
interface CursorInfo {
  position: monaco.Position;
  offset: number;
  lineContent: string;
  wordRange: monaco.Range | null;
  wordAtPosition: string | undefined;
}

// Structure for visible range information
interface VisibleRangeInfo {
  startLineNumber: number;
  endLineNumber: number;
  content: string;
}

// Define the context type
interface LatexContextType {
  // Public methods
  setCurrentModel: (model: monaco.editor.ITextModel | null) => void;
  setCurrentEditor: (
    editor: monaco.editor.IStandaloneCodeEditor | null
  ) => void;
  getCurrentDocument: () => string | undefined;
  getCurrentDocumentAST: () => latexParser.LatexAst | undefined;
  getCurrentNode: () => LatexNode | null;
  getCurrentCursorInfo: () => CursorInfo | null;
  getVisibleRangeInfo: () => VisibleRangeInfo | null;
  getRecentEditsSummary: () => EditChange[];
  // Make the update functions public
  updateCursorInfo: () => void;
  updateVisibleRange: () => void;
  updateDocumentAST: () => void;
  processEditorContentChanges: (
    event: monaco.editor.IModelContentChangedEvent
  ) => void;
}

// Create context with a default empty value
const LatexContext = createContext<LatexContextType | null>(null);

// Custom hook for using the context
export const useLatexContext = () => {
  const context = useContext(LatexContext);
  if (context === null) {
    throw new Error(
      "useLatexContext must be used within a LatexContextProvider"
    );
  }
  return context;
};

// Provider component
interface LatexContextProviderProps {
  children: ReactNode;
}

export const LatexContextProvider: React.FC<LatexContextProviderProps> = ({
  children,
}) => {
  const [currentModel, setCurrentModel] =
    useState<monaco.editor.ITextModel | null>(null);
  const [currentEditor, setCurrentEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRangeInfo | null>(
    null
  );
  const [documentAST, setDocumentAST] = useState<latexParser.LatexAst>();
  const [currentNode, setCurrentNode] = useState<LatexNode | null>(null);

  // Track edit history
  const editTrackerRef = useRef<EditTracker | null>(null);

  // Initialize EditTracker when editor changes
  useEffect(() => {
    if (!currentEditor) return;

    // Initialize EditTracker if needed
    if (!editTrackerRef.current) {
      editTrackerRef.current = new EditTracker(currentEditor);
    }

    // Initial updates
    updateCursorInfo();
    updateVisibleRange();
    updateDocumentAST();
  }, [currentEditor, currentModel]);

  // Function to update cursor information - now publicly accessible
  const updateCursorInfo = () => {
    if (!currentEditor || !currentModel) return;

    const position = currentEditor.getPosition();
    if (!position) return;

    const offset = currentModel.getOffsetAt(position);
    const lineContent = currentModel.getLineContent(position.lineNumber);

    // Get word at position using standard method
    const wordInfo = currentModel.getWordAtPosition(position);

    // Create a range if wordInfo exists
    let wordRange = null;
    if (wordInfo) {
      wordRange = new monaco.Range(
        position.lineNumber,
        wordInfo.startColumn,
        position.lineNumber,
        wordInfo.endColumn
      );
    }

    setCursorInfo({
      position,
      offset,
      lineContent,
      wordRange: wordRange,
      wordAtPosition: wordInfo ? wordInfo.word : undefined,
    });
  };

  // Function to update visible range - now publicly accessible
  const updateVisibleRange = () => {
    if (!currentEditor || !currentModel) return;

    const visibleRanges = currentEditor.getVisibleRanges();
    if (visibleRanges.length === 0) return;

    // Just use the first visible range for now
    const range = visibleRanges[0];

    try {
      const content = currentModel.getValueInRange(range);
      setVisibleRange({
        startLineNumber: range.startLineNumber,
        endLineNumber: range.endLineNumber,
        content,
      });
    } catch (error) {
      console.error("[LatexContext] Error getting visible range:", error);
    }
  };

  const updateCurrentNode = () => {
    if (!currentModel || !cursorInfo || !documentAST) return;
    const findNodeAtCursor = (node: LatexNode): LatexNode | null => {
      if (!node || !node.location) return null;
      const { start, end } = node.location;
      // Check if the cursor is within this node
      if (start.offset <= cursorInfo.offset && cursorInfo.offset < end.offset) {
        // If the node has children, check if any child contains the cursor
        if ("content" in node && Array.isArray(node.content)) {
          for (const child of node.content) {
            if (!child) continue;
            const childNode = findNodeAtCursor(child);
            if (childNode) return childNode;
          }
        }
        // Similarly check args if present
        if ("args" in node && Array.isArray(node.args)) {
          for (const arg of node.args) {
            if (!arg) continue;
            const argNode = findNodeAtCursor(arg);
            if (argNode) return argNode;
          }
        }
        // If no children contain the cursor, this is the most specific node
        return node;
      }
      return null;
    }
    let currentNode = null;
    for (const node of documentAST.content) {
      currentNode = findNodeAtCursor(node);
      if (currentNode) break;
    }
    setCurrentNode(currentNode);
  };

  const updateDocumentAST = () => {
    if (!currentModel) return;
    setDocumentAST(parseLatex(currentModel.getValue()));
  };

  useEffect(() => {
    updateCurrentNode();
  }, [cursorInfo, documentAST]);

  // Process content changes - now publicly accessible
  const processEditorContentChanges = (
    event: monaco.editor.IModelContentChangedEvent
  ) => {
    // Update edit tracker
    if (editTrackerRef.current) {
      editTrackerRef.current.processEditorContentChanges(event);
    }
  };

  // Context value - exposing methods we want to make public
  const contextValue: LatexContextType = {
    setCurrentModel,
    setCurrentEditor,
    getCurrentDocument: () => {
      if (!currentModel) return undefined;
      return currentModel.getValue();
    },
    getCurrentDocumentAST: () => documentAST,
    getCurrentNode: () => currentNode,
    getCurrentCursorInfo: () => cursorInfo,
    getVisibleRangeInfo: () => visibleRange,
    getRecentEditsSummary: () => {
      if (!editTrackerRef.current) return [];
      return editTrackerRef.current.getRecentChangesSummary();
    },
    updateCursorInfo,
    updateVisibleRange,
    updateDocumentAST,
    processEditorContentChanges,
  };

  return (
    <LatexContext.Provider value={contextValue}>
      {children}
    </LatexContext.Provider>
  );
};

const LatexContextSystem: React.FC<LatexContextProviderProps> = ({
  children,
}) => {
  return <LatexContextProvider>{children}</LatexContextProvider>;
};

export default LatexContextSystem;
