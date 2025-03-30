import { useState } from "react";
import LatexEditor from "./components/LatexEditor";
import LatexPreview from "./components/LatexPreview";
import { getFilename } from "./utils/generalUtils";

declare global {
  interface Window {
    electron: {
      openFile: () => Promise<{ path: string; content: string } | null>;
      saveFile: (path: string, content: string) => Promise<string | null>;
    };
  }
}

// Sample LaTeX document with various elements
const EXAMPLE_DOCUMENT = `\\documentclass{article}
\\title{Sample LaTeX Document}
\\author{AI Editor}
\\date{\\today}

\\begin{document}

\\tableofcontents

\\section{Introduction}
This is a sample LaTeX document that demonstrates various LaTeX features.

\\subsection{Math Expressions}
Here are some inline math expressions: $E = mc^2$ and $F = ma$.

\\subsection{Displayed Math}
The quadratic formula is:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

\\section{Text Formatting}
You can make text \\textbf{bold} or \\textit{italic}. 
You can also \\emph{emphasize} important points.

\\section{Mathematics}
The sum of an infinite series:
\\begin{equation}
\\sum_{n=0}^{\\infty} \\frac{1}{n!} = e
\\end{equation}

Euler's identity states:
$$e^{i\\pi} + 1 = 0$$

This connects five fundamental constants: $e$, $i$, $\\pi$, $1$, and $0$.

\\end{document}`;

const App = () => {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState<string>(`\\documentclass{article}
\\begin{document}
Hello, LaTeX!
\\end{document}`);
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);

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

  const loadExample = () => {
    setContent(EXAMPLE_DOCUMENT);
    setFilePath(null);
  };

  // Extract filename from path
  const fileName = filePath ? getFilename(filePath) : "Untitled.tex";

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const container = e.currentTarget as HTMLDivElement;
      const containerRect = container.getBoundingClientRect();
      const newRatio =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setSplitRatio(Math.max(20, Math.min(80, newRatio)));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
          <button
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm"
            onClick={loadExample}
          >
            Example
          </button>
        </div>
        <div className="text-sm truncate max-w-md">{fileName}</div>
        <div className="text-xs text-gray-300">AI-powered LaTeX Editor</div>
      </div>
      <div
        className="flex flex-grow relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ height: "calc(100vh - 40px)" }}
      >
        <div style={{ width: `${splitRatio}%` }} className="h-full">
          <LatexEditor
            value={content}
            onChange={setContent}
            height="calc(100vh - 40px)"
          />
        </div>
        <div
          className="absolute top-0 bottom-0 w-1 bg-gray-300 cursor-col-resize hover:bg-blue-500"
          style={{ left: `calc(${splitRatio}% - 2px)` }}
          onMouseDown={handleMouseDown}
        ></div>
        <div style={{ width: `${100 - splitRatio}%` }} className="h-full">
          <LatexPreview content={content} />
        </div>
      </div>
    </div>
  );
};

export default App;
