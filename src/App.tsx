import React, { useState } from "react";
import LatexEditor from "./components/LatexEditor";

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

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-gray-800 text-white">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={openFile}
        >
          Open
        </button>
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-2"
          onClick={saveFile}
        >
          Save
        </button>
      </div>
      <LatexEditor value={content} onChange={setContent} />
    </div>
  );
};

export default App;
