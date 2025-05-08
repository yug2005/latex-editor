import { useState, useEffect, useRef } from "react";
import LatexEditor from "./components/LatexEditor";
import LatexPreview from "./components/LatexPreview";
import { getFilename } from "./utils/generalUtils";
import AIChat from "./components/AIChat";
import { EXAMPLE_DOCUMENT, DEFAULT_DOCUMENT } from "./assets/exampleDocument";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import * as monaco from "monaco-editor";
import LatexContextSystem from "./components/LatexContextSystem";

declare global {
  interface Window {
    electron: {
      openFile: () => Promise<{ path: string; content: string } | null>;
      saveFile: (path: string, content: string) => Promise<string | null>;
    };
  }
}

const App = () => {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState<string>(EXAMPLE_DOCUMENT);
  const [initialContent, setInitialContent] =
    useState<string>(EXAMPLE_DOCUMENT);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Check for unsaved changes when content changes
  useEffect(() => {
    setHasUnsavedChanges(content !== initialContent);
  }, [content, initialContent]);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const confirmDiscardChanges = (): boolean => {
    if (hasUnsavedChanges) {
      return window.confirm(
        "You have unsaved changes. Are you sure you want to discard them?"
      );
    }
    return true;
  };

  const openFile = async () => {
    if (!confirmDiscardChanges()) return;

    const file = await window.electron.openFile();
    if (file) {
      setFilePath(file.path);
      setContent(file.content);
      setInitialContent(file.content);
    }
  };

  const saveFile = async () => {
    const savedPath = await window.electron.saveFile(filePath || "", content);
    if (savedPath) {
      setFilePath(savedPath);
      setInitialContent(content);
    }
  };

  const newFile = () => {
    if (!confirmDiscardChanges()) return;

    setContent(DEFAULT_DOCUMENT);
    setInitialContent(DEFAULT_DOCUMENT);
    setFilePath(null);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    editorRef.current = editor;

    // Set up cursor position tracking
    editor.onDidChangeCursorPosition((e) => {
      const model = editor.getModel();
      if (model) {
        const offset = model.getOffsetAt(e.position);
        setCursorPosition(offset);
      }
    });
  };

  // Extract filename from path
  const fileName = filePath ? getFilename(filePath) : "Untitled.tex";
  const displayFileName = hasUnsavedChanges ? `${fileName} *` : fileName;

  // Custom resize handle component
  const ResizeHandle = () => {
    return (
      <PanelResizeHandle className="w-1 bg-neutral-300 hover:bg-blue-500 dark:bg-neutral-600 dark:hover:bg-neutral-500 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-1 rounded-full bg-neutral-400 dark:bg-neutral-500"></div>
        </div>
      </PanelResizeHandle>
    );
  };

  // Vertical resize handle component
  const VerticalResizeHandle = () => {
    return (
      <PanelResizeHandle className="h-1 bg-neutral-300 hover:bg-blue-500 dark:bg-neutral-600 dark:hover:bg-neutral-500 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-1 rounded-full bg-neutral-400 dark:bg-neutral-500"></div>
        </div>
      </PanelResizeHandle>
    );
  };

  return (
    <LatexContextSystem>
      <div className="flex flex-col h-screen bg-neutral-50 dark:bg-[#202020]">
        <div className="flex justify-between items-center p-2 bg-neutral-800 text-white dark:bg-[#181818]">
          <div className="flex items-center space-x-2">
            <button
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm"
              onClick={newFile}
            >
              New
            </button>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
              onClick={openFile}
            >
              Open
            </button>
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
              onClick={saveFile}
            >
              Save
            </button>
            <button
              className={`${
                isChatOpen
                  ? "bg-indigo-500 hover:bg-indigo-700"
                  : "bg-neutral-500 hover:bg-neutral-700"
              } text-white font-bold py-1 px-3 rounded text-sm flex items-center`}
              onClick={toggleChat}
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
                className="mr-1"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Chat
            </button>
            <button
              className={`bg-amber-500 hover:bg-amber-700 text-white font-bold py-1 px-3 rounded text-sm flex items-center`}
              onClick={toggleDarkMode}
            >
              {darkMode ? (
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
                  className="mr-1"
                >
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
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
                  className="mr-1"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
              {darkMode ? "Light" : "Dark"}
            </button>
          </div>
          <div className="text-sm truncate max-w-md">{displayFileName}</div>
          <div className="text-xs text-neutral-300">
            AI-powered LaTeX Editor
          </div>
        </div>

        <div
          className="flex-grow overflow-hidden"
          style={{ height: "calc(100vh - 40px)" }}
        >
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={50} minSize={25}>
              <PanelGroup direction="vertical" className="h-full">
                <Panel
                  defaultSize={isChatOpen ? 70 : 100}
                  minSize={30}
                  className="overflow-hidden"
                >
                  <div className="h-full flex flex-col">
                    <LatexEditor
                      value={content}
                      onChange={setContent}
                      height="100%"
                      onEditorDidMount={handleEditorDidMount}
                    />
                  </div>
                </Panel>

                {isChatOpen && (
                  <>
                    <VerticalResizeHandle />
                    <Panel
                      defaultSize={30}
                      minSize={25}
                      className="overflow-hidden"
                    >
                      <AIChat
                        onClose={toggleChat}
                        editorContent={content}
                        cursorPosition={cursorPosition}
                      />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </Panel>

            <ResizeHandle />

            <Panel minSize={25} className="overflow-hidden">
              <LatexPreview content={content} />
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </LatexContextSystem>
  );
};

export default App;
