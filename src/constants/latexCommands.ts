export interface LatexCommand {
  keyword: string;
  description: string;
}

export const LATEX_COMMANDS: LatexCommand[] = [
  // Document structure
  {
    keyword: "documentclass",
    description: "Specifies the document class (e.g., article, book, report)",
  },
  { keyword: "document", description: "Main document environment" },
  { keyword: "begin", description: "Starts a new environment" },
  { keyword: "end", description: "Ends an environment" },
  { keyword: "usepackage", description: "Loads a LaTeX package" },
  { keyword: "input", description: "Includes content from another file" },
  {
    keyword: "include",
    description: "Includes content from another file (with page breaks)",
  },

  // Sections
  { keyword: "part", description: "Creates a part-level section" },
  { keyword: "chapter", description: "Creates a chapter-level section" },
  { keyword: "section", description: "Creates a section-level heading" },
  { keyword: "subsection", description: "Creates a subsection-level heading" },
  {
    keyword: "subsubsection",
    description: "Creates a subsubsection-level heading",
  },
  { keyword: "paragraph", description: "Creates a paragraph-level heading" },
  {
    keyword: "subparagraph",
    description: "Creates a subparagraph-level heading",
  },

  // Lists
  { keyword: "itemize", description: "Creates an unordered list" },
  { keyword: "enumerate", description: "Creates a numbered list" },
  { keyword: "description", description: "Creates a description list" },
  { keyword: "item", description: "Creates a list item" },

  // Math
  { keyword: "frac", description: "Creates a fraction" },
  { keyword: "sqrt", description: "Creates a square root" },
  { keyword: "sum", description: "Creates a summation symbol" },
  { keyword: "int", description: "Creates an integral symbol" },
  { keyword: "prod", description: "Creates a product symbol" },
  { keyword: "lim", description: "Creates a limit" },
  { keyword: "infty", description: "Creates an infinity symbol" },
  { keyword: "partial", description: "Creates a partial derivative symbol" },
  { keyword: "alpha", description: "Greek letter alpha" },
  { keyword: "beta", description: "Greek letter beta" },
  { keyword: "gamma", description: "Greek letter gamma" },
  { keyword: "delta", description: "Greek letter delta" },

  // Text formatting
  { keyword: "textbf", description: "Bold text" },
  { keyword: "textit", description: "Italic text" },
  { keyword: "emph", description: "Emphasized text" },
  { keyword: "underline", description: "Underlined text" },
  { keyword: "texttt", description: "Typewriter text" },
  { keyword: "textrm", description: "Roman text" },
  { keyword: "textsl", description: "Slanted text" },
  { keyword: "textsc", description: "Small caps text" },

  // Tables
  { keyword: "table", description: "Creates a floating table environment" },
  { keyword: "tabular", description: "Creates a table" },
  { keyword: "hline", description: "Creates a horizontal line in a table" },
  { keyword: "vline", description: "Creates a vertical line in a table" },
  {
    keyword: "multicolumn",
    description: "Creates a cell spanning multiple columns",
  },
  { keyword: "multirow", description: "Creates a cell spanning multiple rows" },

  // Figures
  { keyword: "figure", description: "Creates a floating figure environment" },
  { keyword: "includegraphics", description: "Includes an image" },
  {
    keyword: "caption",
    description: "Creates a caption for a figure or table",
  },
  { keyword: "label", description: "Creates a label for cross-referencing" },
  { keyword: "ref", description: "References a labeled item" },

  // Bibliography
  { keyword: "bibliography", description: "Specifies the bibliography file" },
  { keyword: "cite", description: "Cites a reference" },
  {
    keyword: "nocite",
    description: "Adds a reference to bibliography without citing",
  },
  {
    keyword: "bibliographystyle",
    description: "Specifies the bibliography style",
  },

  // Other common commands
  { keyword: "title", description: "Sets the document title" },
  { keyword: "author", description: "Sets the document author" },
  { keyword: "date", description: "Sets the document date" },
  { keyword: "maketitle", description: "Generates the title page" },
  { keyword: "abstract", description: "Creates an abstract environment" },
  { keyword: "newpage", description: "Starts a new page" },
  { keyword: "clearpage", description: "Clears the current page" },
  { keyword: "footnote", description: "Creates a footnote" },
  { keyword: "marginpar", description: "Creates a margin note" },
  { keyword: "parindent", description: "Sets paragraph indentation" },
  { keyword: "parskip", description: "Sets paragraph spacing" },
  { keyword: "vspace", description: "Adds vertical space" },
  { keyword: "hspace", description: "Adds horizontal space" },
];
