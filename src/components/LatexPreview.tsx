import React, { useEffect, useState, useRef } from "react";
import compileLatex from "../utils/latexCompiler";

interface LatexPreviewProps {
  content: string;
}

const LatexPreview: React.FC<LatexPreviewProps> = ({ content }) => {
  const [compiledHtml, setCompiledHtml] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const compileDocument = async () => {
      setIsCompiling(true);
      setError(null);

      try {
        // Add a small delay to avoid too frequent updates
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Use our LaTeX compiler
        const html = compileLatex(content);
        setCompiledHtml(html);
      } catch (err) {
        setError("Failed to compile LaTeX document");
        console.error(err);
      } finally {
        setIsCompiling(false);
      }
    };

    // Debounce compilation to avoid too frequent updates
    const timeoutId = setTimeout(() => {
      compileDocument();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [content]);

  // Handle link clicks within the iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !compiledHtml) return;

    const handleLoad = () => {
      try {
        const iframeDocument =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDocument) return;

        // Add click event listener to all links in the iframe
        const links = iframeDocument.querySelectorAll("a");
        links.forEach((link) => {
          link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (!href) return;

            // Check if the link is an internal anchor
            if (href.startsWith("#")) {
              e.preventDefault();
              // Navigate to the anchor within the iframe
              const targetElement = iframeDocument.querySelector(href);
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: "smooth" });
              }
            } else {
              // External link - open in a new tab
              e.preventDefault();
              window.open(href, "_blank");
            }
          });
        });
      } catch (err) {
        console.error("Error setting up iframe link handlers:", err);
      }
    };

    iframe.addEventListener("load", handleLoad);

    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, [compiledHtml]);

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-100 px-2 h-8 text-sm font-medium border-b flex justify-between items-center">
        <span>Preview</span>
        <div className="flex items-center space-x-2">
          {isCompiling && (
            <span className="text-xs text-gray-500">Compiling...</span>
          )}
        </div>
      </div>
      <div className="flex-grow overflow-auto bg-white">
        {error ? (
          <div className="p-4 text-red-500">{error}</div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={compiledHtml}
            title="LaTeX Preview"
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        )}
      </div>
    </div>
  );
};

export default LatexPreview;
