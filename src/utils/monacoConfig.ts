import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { LATEX_COMMANDS } from "../constants/latexCommands";

// Initialize Monaco loader
loader.config({
  paths: {
    // TODO: Update to the latest version
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
  },
});

// Flag to prevent multiple initializations
let isMonacoInitialized = false;

export const initializeMonaco = async () => {
  if (isMonacoInitialized) return;
  isMonacoInitialized = true;

  // Wait for Monaco to be loaded
  await loader.init().then((monaco) => {
    // Define custom theme colors for LaTeX
    monaco.editor.defineTheme("latexTheme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "0000FF" }, // Blue for LaTeX commands
        { token: "type", foreground: "008080" }, // Teal for other commands
        { token: "comment", foreground: "008000" }, // Green for comments
        { token: "string", foreground: "A31515" }, // Red for math mode
        { token: "delimiter", foreground: "000000" }, // Black for delimiters
        { token: "operator", foreground: "000000" }, // Black for operators
      ],
      colors: {},
    });

    // Set the theme
    monaco.editor.setTheme("latexTheme");

    // Register LaTeX language
    monaco.languages.register({ id: "latex" });

    // Create a regex pattern for LaTeX commands
    const latexCommandPattern = new RegExp(
      `\\\\(${LATEX_COMMANDS.map((c) => c.keyword).join("|")})`
    );

    // Set up LaTeX language features
    monaco.languages.setMonarchTokensProvider("latex", {
      defaultToken: "",
      tokenizer: {
        root: [
          // Comments
          [/%.*$/, "comment"],
          // LaTeX commands (keywords)
          [latexCommandPattern, "keyword"],
          // Other commands
          [/\\[a-zA-Z]+/, "type"],
          // Special characters
          [/[{}]/, "delimiter"],
          [/[$&^_]/, "operator"],
          // Math mode
          [/\$\$/, "delimiter", "@mathMode"],
          [/\$/, "delimiter", "@inlineMathMode"],
          // Arguments in square brackets
          [/\[/, "delimiter", "@bracketArgument"],
          // Text
          [/[^\\%{}\[\]$&^_]+/, ""],
        ],
        mathMode: [
          [/[^$]+/, "string"],
          [/\$\$/, "delimiter", "@pop"],
        ],
        inlineMathMode: [
          [/[^$]+/, "string"],
          [/\$/, "delimiter", "@pop"],
        ],
        bracketArgument: [
          [/[^\]]+/, "string"],
          [/\]/, "delimiter", "@pop"],
        ],
      },
    });

    // Register LaTeX-specific formatting rules
    monaco.languages.setLanguageConfiguration("latex", {
      comments: {
        lineComment: "%",
      },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "$", close: "$" },
        { open: "\\begin{", close: "\\end{", notIn: ["string"] },
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "$", close: "$" },
      ],
      indentationRules: {
        increaseIndentPattern: /\\begin{(?!document)}/,
        decreaseIndentPattern: /\\end{(?!document)}/,
      },
    });

    // Register LaTeX completion provider
    monaco.languages.registerCompletionItemProvider("latex", {
      triggerCharacters: ["\\"],
      provideCompletionItems: (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.CompletionList> => {
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);
        const afterBackslash = beforeCursor.split("\\").pop() || "";

        // If we're not after a backslash, return no suggestions
        if (!beforeCursor.endsWith("\\")) {
          return { suggestions: [] };
        }

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column - afterBackslash.length - 1, // Account for the backslash
          endColumn: position.column,
        };

        // Filter suggestions based on what's typed after the backslash
        const suggestions = LATEX_COMMANDS.filter((command) =>
          command.keyword.startsWith(afterBackslash)
        ).map((command) => {
          let insertText = `\\${command.keyword}`;
          let insertTextRules = undefined;

          // Add special handling for different commands
          switch (command.keyword) {
            case "begin":
              insertText = "\\begin{$1}\n\t$2\n\\end{$1}";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            case "section":
              insertText = "\\section{$1}";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            case "subsection":
              insertText = "\\subsection{$1}";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            case "frac":
              insertText = "\\frac{$1}{$2}";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            case "sqrt":
              insertText = "\\sqrt{$1}";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            case "item":
              insertText = "\\item $1";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            case "label":
              insertText = "\\label{$1}";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            case "ref":
              insertText = "\\ref{$1}";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            case "cite":
              insertText = "\\cite{$1}";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            case "includegraphics":
              insertText = "\\includegraphics{$1}";
              insertTextRules =
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              break;
            default:
              // For commands that typically take arguments, add a placeholder
              if (
                [
                  "textbf",
                  "textit",
                  "emph",
                  "underline",
                  "texttt",
                  "textrm",
                  "textsl",
                  "textsc",
                ].includes(command.keyword)
              ) {
                insertText = `\\${command.keyword}{$1}`;
                insertTextRules =
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
              }
          }

          return {
            label: "\\" + command.keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText,
            insertTextRules,
            range,
            detail: command.description,
            sortText: command.keyword,
            preselect: command.keyword === afterBackslash,
          };
        });

        return { suggestions };
      },
    });
  });
};
