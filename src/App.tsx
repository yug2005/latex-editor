import { useState } from "react";
import LatexEditor from "./components/LatexEditor";
import { getFilename } from "./utils/generalUtils";

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
  const [content, setContent] = useState<string>(`\\documentclass{article}
\\begin{document}
Hello, LaTeX!
\\end{document}`);

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
      <div className="flex-grow">
        <LatexEditor
          value={content}
          onChange={setContent}
          height="calc(100vh - 40px)"
        />
      </div>
    </div>
  );
};

export default App;
