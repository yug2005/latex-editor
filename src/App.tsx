import { useState } from "react";
import LatexEditor from "./components/LatexEditor";
import LatexPreview from "./components/LatexPreview";
import { getFilename } from "./utils/generalUtils";
import { EXAMPLE_DOCUMENT } from "./assets/exampleDocument";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

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

  const openFile = async () => {
    const file = await window.electron.openFile();
    if (file) {
      setFilePath(file.path);
      setContent(file.content);
    }
  };

  const saveFile = async () => {
    const savedPath = await window.electron.saveFile(filePath || "", content);
    if (savedPath) setFilePath(savedPath);
  };

  // Extract filename from path
  const fileName = filePath ? getFilename(filePath) : "Untitled.tex";

  // Custom resize handle component
  const ResizeHandle = () => {
    return (
      <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-blue-500 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-1 rounded-full bg-gray-400"></div>
        </div>
      </PanelResizeHandle>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex justify-between items-center p-2 bg-gray-800 text-white">
        <div className="flex items-center space-x-2">
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
        </div>
        <div className="text-sm truncate max-w-md">{fileName}</div>
        <div className="text-xs text-gray-300">AI-powered LaTeX Editor</div>
      </div>

      <div className="flex-grow" style={{ height: "calc(100vh - 40px)" }}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={50} minSize={25}>
            <LatexEditor
              value={content}
              onChange={setContent}
              height="calc(100vh - 40px)"
            />
          </Panel>
          <ResizeHandle />
          <Panel minSize={25}>
            <LatexPreview content={content} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};

export default App;
