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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "10px", background: "#aeaeae", color: "white" }}>
        <button onClick={openFile}>Open</button>
        <button onClick={saveFile} style={{ marginLeft: "10px" }}>
          Save
        </button>
      </div>
      <LatexEditor value={content} onChange={setContent} />
    </div>
  );
};

export default App;
