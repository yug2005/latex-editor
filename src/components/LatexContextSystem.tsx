import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useRef,
  useEffect,
} from "react";
import * as monaco from "monaco-editor";
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
  getCurrentDocument: () => string;
  getCurrentCursorInfo: () => CursorInfo | null;
  getVisibleRangeInfo: () => VisibleRangeInfo | null;
  getRecentEditsSummary: () => EditChange[];
  // Make the update functions public
  updateCursorInfo: () => void;
  updateVisibleRange: () => void;
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
  // Private state - not directly exposed in the context
  const [currentModel, setCurrentModel] =
    useState<monaco.editor.ITextModel | null>(null);
  const [currentEditor, setCurrentEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRangeInfo | null>(
    null
  );

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

    console.log("[LatexContext] Cursor position updated:", offset);
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
      console.log(
        "[LatexContext] Visible range updated:",
        `${range.startLineNumber}-${range.endLineNumber}`
      );
    } catch (error) {
      console.error("[LatexContext] Error getting visible range:", error);
    }
  };

  // Process content changes - now publicly accessible
  const processEditorContentChanges = (
    event: monaco.editor.IModelContentChangedEvent
  ) => {
    // Update edit tracker
    if (editTrackerRef.current) {
      editTrackerRef.current.processEditorContentChanges(event);
      console.log("[LatexContext] Editor content changes processed");
    }
  };

  // Context value - exposing methods we want to make public
  const contextValue: LatexContextType = {
    setCurrentModel,
    setCurrentEditor,
    getCurrentDocument: () => {
      if (!currentModel) return "";
      return currentModel.getValue();
    },
    getCurrentCursorInfo: () => cursorInfo,
    getVisibleRangeInfo: () => visibleRange,
    getRecentEditsSummary: () => {
      if (!editTrackerRef.current) return [];
      return editTrackerRef.current.getRecentChangesSummary();
    },
    updateCursorInfo,
    updateVisibleRange,
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
