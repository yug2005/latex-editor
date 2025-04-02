/**
 * LaTeX compiler with MathJax integration
 * Uses a hybrid approach with basic LaTeX parsing and MathJax for rendering
 */

/**
 * A consistent section numbering system for LaTeX processing
 */
interface HeadingInfo {
  text: string;
  level: number;
  number: string;
  index: number; // Position in the original document
}

/**
 * Track loaded packages
 */
interface PackageInfo {
  name: string;
  options?: string;
}

/**
 * Process a LaTeX document to HTML with MathJax
 */
export const compileLatex = (latex: string): string => {
  // Remove comments first
  latex = removeLatexComments(latex);

  // Extract packages
  const packages = extractPackages(latex);

  // Basic preprocessing - strip document class and document environment
  let content = latex
    .replace(/\\documentclass(\[.*?\])?\{.*?\}/g, "")
    .replace(/\\begin\{document\}/g, "")
    .replace(/\\end\{document\}/g, "")
    .trim();

  // Remove usepackage commands after extracting them
  content = content.replace(/\\usepackage(?:\[(.*?)\])?\{(.*?)\}/g, "");

  // Process text formatting before other processing
  content = processLaTeXCommands(content);

  // First analyze document structure to get consistent numbering
  const headings = analyzeDocumentStructure(content);

  // Process sections using the analyzed structure
  content = processSectionsWithStructure(content, headings);

  // Process special commands (like \today and \tableofcontents)
  content = processSpecialCommands(content, headings);

  // For simplicity, we use a hybrid approach:
  // 1. Use our basic parser for document structure
  // 2. Load MathJax in the iframe for math rendering

  const packageConfigJS = generatePackageConfigJS(packages);

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <script type="text/javascript" id="MathJax-script" async
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">
        </script>
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.5;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 { font-size: 24px; margin-top: 24px; margin-bottom: 16px; }
          h2 { font-size: 20px; margin-top: 20px; margin-bottom: 14px; }
          h3 { font-size: 18px; margin-top: 18px; margin-bottom: 12px; }
          p { margin-bottom: 16px; }
          strong, .bold { font-weight: bold; }
          em, .italic { font-style: italic; }
          .mjx-chtml { display: inline-block; }
          .mjx-math { text-align: center; margin: 1em 0; }
          .toc { margin: 20px 0; }
          .toc h2 { margin-top: 0; margin-bottom: 16px; }
          .toc ul { list-style-type: none; margin: 0; padding: 0; }
          .toc-h1 { margin-left: 0; margin-bottom: 8px; }
          .toc-h2 { margin-left: 20px; margin-bottom: 6px; }
          .toc-h3 { margin-left: 40px; margin-bottom: 6px; }
          .toc a { text-decoration: none; color: inherit; }
          .section-number { margin-right: 8px; font-weight: bold; }
          
          /* List styles */
          ul, ol { margin: 16px 0; padding-left: 30px; }
          li { margin-bottom: 8px; }
          ol { list-style-type: decimal; }
          ol ol { list-style-type: lower-alpha; }
          ol ol ol { list-style-type: lower-roman; }
          
          /* Table styles */
          table {
            border-collapse: collapse;
            width: 100%;
          }
          table.centered {
            margin-left: auto;
            margin-right: auto;
          }
          td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          tr.hline {
            border-bottom: 2px solid #000;
            height: 1px;
          }
          .table-container {
            margin: 20px 0;
            overflow-x: auto;
          }
          .table-caption {
            text-align: center;
            font-style: italic;
            margin-top: 8px;
          }
          /* Table placement styles */
          .table-container[data-placement="h"] {
            /* 'here' placement */
            position: relative;
          }
          .table-container[data-placement="t"] {
            /* 'top' placement */
            margin-top: 0;
          }
          .table-container[data-placement="b"] {
            /* 'bottom' placement */
            margin-top: 30px;
          }
          .table-container[data-placement="p"] {
            /* 'page' placement - a bit harder to simulate */
            page-break-inside: avoid;
          }
          
          /* Page break styling */
          .page-break {
            page-break-after: always;
            margin: 30px 0;
            border-bottom: 1px dashed #ccc;
          }
        </style>
        <script>
          window.MathJax = {
            tex: {
              inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
              displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
              processEscapes: true,
              processEnvironments: true,
              packages: ['base', 'ams', 'noerrors', 'noundefined', 'enumerate'${packageConfigJS}]
            },
            options: {
              skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
              ignoreHtmlClass: 'tex2jax_ignore',
              processHtmlClass: 'tex2jax_process'
            }
          };
        </script>
      </head>
      <body>
        ${processContent(content)}
      </body>
    </html>
  `;
};

/**
 * Remove LaTeX comments from the source
 * Comments in LaTeX start with % and continue to the end of the line
 */
const removeLatexComments = (source: string): string => {
  // This handles % comments but preserves \% escaped percent signs
  let result = "";
  let inComment = false;
  let i = 0;

  while (i < source.length) {
    // Check for escaped percent sign
    if (i < source.length - 1 && source[i] === "\\" && source[i + 1] === "%") {
      result += "\\%";
      i += 2;
      continue;
    }

    // Check for comment start
    if (source[i] === "%") {
      inComment = true;
    }

    // Check for end of line
    if (source[i] === "\n") {
      inComment = false;
      result += "\n";
    } else if (!inComment) {
      result += source[i];
    }

    i++;
  }

  return result;
};

/**
 * Extract LaTeX package information
 */
const extractPackages = (latex: string): PackageInfo[] => {
  const packages: PackageInfo[] = [];

  // Extract \usepackage commands
  const packageRegex = /\\usepackage(?:\[(.*?)\])?\{(.*?)\}/g;
  let match;

  while ((match = packageRegex.exec(latex)) !== null) {
    const options = match[1];
    const packageNames = match[2].split(",").map((p) => p.trim());

    for (const name of packageNames) {
      packages.push({
        name,
        options: options,
      });
    }
  }

  return packages;
};

/**
 * Generate MathJax package configuration from LaTeX packages
 */
const generatePackageConfigJS = (packages: PackageInfo[]): string => {
  // Map LaTeX packages to MathJax packages
  const packageMap: Record<string, string> = {
    amsmath: "ams",
    amssymb: "ams",
    amsthm: "ams",
    mathtools: "ams",
    physics: "physics",
    cancel: "cancel",
    color: "color",
    xcolor: "color",
    bm: "boldsymbol",
    enumerate: "enumerate",
    algorithm: "algorithm",
    algorithmic: "algorithm",
    mhchem: "mhchem",
  };

  // Add supported packages to MathJax config
  const supportedPackages = packages
    .map((pkg) => packageMap[pkg.name])
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

  if (supportedPackages.length === 0) return "";

  return ", '" + supportedPackages.join("', '") + "'";
};

/**
 * Process standard LaTeX commands
 */
const processLaTeXCommands = (content: string): string => {
  // Process text formatting commands directly
  for (let i = 0; i < 5; i++) {
    // Do multiple passes to handle nesting
    // Replace \textbf{...} with <strong>...</strong>
    content = content.replace(/\\textbf\{([^{}]*)\}/g, "<strong>$1</strong>");

    // Replace \textit{...} with <em>...</em>
    content = content.replace(/\\textit\{([^{}]*)\}/g, "<em>$1</em>");

    // Replace \emph{...} with <em>...</em>
    content = content.replace(/\\emph\{([^{}]*)\}/g, "<em>$1</em>");
  }

  // Process newpage
  content = content.replace(/\\newpage/g, '<div class="page-break"></div>');
  content = content.replace(/\\pagebreak/g, '<div class="page-break"></div>');

  return content;
};

/**
 * Analyze document structure to determine section, subsection, and subsubsection
 * numbering consistently before processing
 */
const analyzeDocumentStructure = (content: string): HeadingInfo[] => {
  const headings: HeadingInfo[] = [];

  // First pass: Find all heading elements and their positions
  // Use regular expressions with exec() instead of matchAll()
  const sectionRegex = /\\section\{(.*?)\}/g;
  const subsectionRegex = /\\subsection\{(.*?)\}/g;
  const subsubsectionRegex = /\\subsubsection\{(.*?)\}/g;

  // Process sections
  let sectionMatch;
  while ((sectionMatch = sectionRegex.exec(content)) !== null) {
    headings.push({
      text: sectionMatch[1],
      level: 1,
      number: "", // Will be calculated in second pass
      index: sectionMatch.index || 0,
    });
  }

  // Process subsections
  let subsectionMatch;
  while ((subsectionMatch = subsectionRegex.exec(content)) !== null) {
    headings.push({
      text: subsectionMatch[1],
      level: 2,
      number: "", // Will be calculated in second pass
      index: subsectionMatch.index || 0,
    });
  }

  // Process subsubsections
  let subsubsectionMatch;
  while ((subsubsectionMatch = subsubsectionRegex.exec(content)) !== null) {
    headings.push({
      text: subsubsectionMatch[1],
      level: 3,
      number: "", // Will be calculated in second pass
      index: subsubsectionMatch.index || 0,
    });
  }

  // Sort all headings by their position in the document
  headings.sort((a, b) => a.index - b.index);

  // Second pass: Calculate proper section numbers
  let currentSectionNumber = 0;
  let currentSubsectionNumber = 0;
  let currentSubsubsectionNumber = 0;

  headings.forEach((heading, i) => {
    if (heading.level === 1) {
      // Section
      currentSectionNumber++;
      currentSubsectionNumber = 0;
      currentSubsubsectionNumber = 0;
      heading.number = `${currentSectionNumber}`;
    } else if (heading.level === 2) {
      // Subsection - find parent section number
      const parentSectionIndex = findLastIndexBefore(headings, i, 1);

      if (parentSectionIndex >= 0) {
        // Parent section exists, use its number
        const parentSectionNumber = headings[parentSectionIndex].number;

        // Check if this is a new subsection of the current section or continuing
        // from a previous subsection of the same parent
        if (i > 0 && headings[i - 1].level === 2) {
          const prevParentSectionIndex = findLastIndexBefore(
            headings,
            i - 1,
            1
          );
          if (prevParentSectionIndex === parentSectionIndex) {
            // Same parent section as previous subsection
            currentSubsectionNumber++;
          } else {
            // Different parent section
            currentSubsectionNumber = 1;
          }
        } else {
          // First subsection under this section
          currentSubsectionNumber = 1;
        }

        heading.number = `${parentSectionNumber}.${currentSubsectionNumber}`;
      } else {
        // No parent section found, assume section 1
        currentSubsectionNumber++;
        heading.number = `1.${currentSubsectionNumber}`;
      }

      currentSubsubsectionNumber = 0;
    } else if (heading.level === 3) {
      // Subsubsection - find parent subsection number
      const parentSubsectionIndex = findLastIndexBefore(headings, i, 2);

      if (parentSubsectionIndex >= 0) {
        // Parent subsection exists
        const parentSubsectionNumber = headings[parentSubsectionIndex].number;

        // Check if this is a new subsubsection or continuing from previous
        if (i > 0 && headings[i - 1].level === 3) {
          const prevParentSubsectionIndex = findLastIndexBefore(
            headings,
            i - 1,
            2
          );
          if (prevParentSubsectionIndex === parentSubsectionIndex) {
            // Same parent subsection
            currentSubsubsectionNumber++;
          } else {
            // Different parent subsection
            currentSubsubsectionNumber = 1;
          }
        } else {
          // First subsubsection under this subsection
          currentSubsubsectionNumber = 1;
        }

        heading.number = `${parentSubsectionNumber}.${currentSubsubsectionNumber}`;
      } else {
        // No parent subsection found - try to find a parent section
        const parentSectionIndex = findLastIndexBefore(headings, i, 1);

        if (parentSectionIndex >= 0) {
          // Parent section exists, but no subsection - assume subsection 1
          const parentSectionNumber = headings[parentSectionIndex].number;
          currentSubsubsectionNumber++;
          heading.number = `${parentSectionNumber}.1.${currentSubsubsectionNumber}`;
        } else {
          // No parent section found, assume section 1, subsection 1
          currentSubsubsectionNumber++;
          heading.number = `1.1.${currentSubsubsectionNumber}`;
        }
      }
    }
  });

  return headings;
};

/**
 * Find the last heading of the specified level before the given index
 */
const findLastIndexBefore = (
  headings: HeadingInfo[],
  currentIndex: number,
  level: number
): number => {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (headings[i].level === level) {
      return i;
    }
  }

  return -1; // Not found
};

/**
 * Process section headings using pre-analyzed structure
 */
const processSectionsWithStructure = (
  content: string,
  headings: HeadingInfo[]
): string => {
  // Create a predictable ordering of headings by index
  const orderedHeadings = [...headings].sort((a, b) => a.index - b.index);

  // Instead of doing replacements sequentially which alters offsets,
  // replace all section tags in a single pass by building up a new string
  let result = "";
  let lastIndex = 0;

  // Process the content in order of appearance
  for (const heading of orderedHeadings) {
    // Determine what kind of tag to look for
    let tagPattern: string;
    if (heading.level === 1) {
      tagPattern = `\\section{${heading.text}}`;
    } else if (heading.level === 2) {
      tagPattern = `\\subsection{${heading.text}}`;
    } else if (heading.level === 3) {
      tagPattern = `\\subsubsection{${heading.text}}`;
    } else {
      continue; // Skip unknown levels
    }

    // Find the position of this exact tag
    const tagIndex = content.indexOf(tagPattern, lastIndex);
    if (tagIndex === -1) continue; // Skip if not found (shouldn't happen)

    // Add content between the last tag and this one
    result += content.substring(lastIndex, tagIndex);

    // Create HTML for this heading
    const id = heading.text
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .toLowerCase();
    let htmlTag: string;

    if (heading.level === 1) {
      htmlTag = `<h1 id="${id}"><span class="section-number">${heading.number}.</span> ${heading.text}</h1>`;
    } else if (heading.level === 2) {
      htmlTag = `<h2 id="${id}"><span class="section-number">${heading.number}</span> ${heading.text}</h2>`;
    } else {
      // level 3
      htmlTag = `<h3 id="${id}"><span class="section-number">${heading.number}</span> ${heading.text}</h3>`;
    }

    // Add the HTML tag to the result
    result += htmlTag;

    // Update last index to after this tag
    lastIndex = tagIndex + tagPattern.length;
  }

  // Add any remaining content
  if (lastIndex < content.length) {
    result += content.substring(lastIndex);
  }

  // Process other elements
  result = result.replace(/\\title\{(.*?)\}/g, '<h1 class="title">$1</h1>');
  result = result.replace(/\\author\{(.*?)\}/g, '<div class="author">$1</div>');
  result = result.replace(/\\date\{(.*?)\}/g, '<div class="date">$1</div>');

  return result;
};

/**
 * Process special LaTeX commands
 */
const processSpecialCommands = (
  content: string,
  headings: HeadingInfo[] = []
): string => {
  // Handle \today command
  content = content.replace(/\\today/g, getCurrentDate());

  // Handle \tableofcontents command
  if (content.includes("\\tableofcontents")) {
    const toc = generateTableOfContents(headings);
    // Replace the tableofcontents command with the actual table of contents
    content = content.replace(/\\tableofcontents/g, toc);
  }

  return content;
};

/**
 * Get current date in LaTeX format
 */
const getCurrentDate = (): string => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const date = new Date();
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

/**
 * Generate table of contents HTML
 */
const generateTableOfContents = (headings: HeadingInfo[]): string => {
  if (headings.length === 0) {
    return '<div class="toc"><h2>Table of Contents</h2><p>No headings found.</p></div>';
  }

  let toc = '<div class="toc"><h2>Table of Contents</h2><ul>';

  headings.forEach((heading) => {
    // Create a clean ID for linking - remove special characters
    const headingId = heading.text
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .toLowerCase();

    toc += `<li class="toc-h${heading.level}">
      <a href="#${headingId}"><span class="section-number">${heading.number}</span> ${heading.text}</a>
    </li>`;
  });

  toc += "</ul></div>";
  return toc;
};

/**
 * Process document content, preserving math expressions for MathJax
 */
const processContent = (content: string): string => {
  // Pre-process all list environments before paragraph splitting
  // This ensures they're handled by our HTML converter not MathJax

  // Process enumerate environments
  content = content.replace(
    /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
    (match, enumContent) => {
      // Process list items
      let htmlList = "<ol>";

      // Split by \item and process each item
      const items = enumContent
        .split(/\\item\s+/)
        .filter((item: string) => item.trim().length > 0)
        .map((item: string) => `<li>${item.trim()}</li>`);

      htmlList += items.join("\n");
      htmlList += "</ol>";

      return htmlList;
    }
  );

  // Process itemize environments
  content = content.replace(
    /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
    (match, itemizeContent) => {
      // Process list items
      let htmlList = "<ul>";

      // Split by \item and process each item
      const items = itemizeContent
        .split(/\\item\s+/)
        .filter((item: string) => item.trim().length > 0)
        .map((item: string) => `<li>${item.trim()}</li>`);

      htmlList += items.join("\n");
      htmlList += "</ul>";

      return htmlList;
    }
  );

  // Basic paragraph handling
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());

  return paragraphs
    .map((p) => {
      // Skip if it's already a section heading or TOC
      if (
        p.trim().startsWith("<h") ||
        p.trim().startsWith('<div class="toc"') ||
        p.trim().startsWith("<ol>") ||
        p.trim().startsWith("<ul>") ||
        p.trim().startsWith('<div class="page-break"')
      )
        return p;

      // Handle text formatting directly here, before other processing
      let processed = p;

      // Process tables before other environments
      processed = processLatexTables(processed);

      // Let MathJax handle math expressions
      // We do simple environment conversions
      processed = processed
        .replace(
          /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g,
          "$$\n$1\n$$"
        )
        .replace(
          /\\begin\{align\}([\s\S]*?)\\end\{align\}/g,
          "$$\n\\begin{aligned}$1\\end{aligned}\n$$"
        );

      // Wrap in paragraph tags if it's not a special environment
      if (
        !processed.startsWith("<ul>") &&
        !processed.startsWith("<ol>") &&
        !processed.startsWith("$$") &&
        !processed.startsWith("<div") &&
        !processed.startsWith("<table")
      ) {
        processed = `<p>${processed}</p>`;
      }

      return processed;
    })
    .join("\n");
};

/**
 * Process LaTeX tables to HTML
 */
const processLatexTables = (content: string): string => {
  // Replace table environment with optional placement parameter [h], [t], etc.
  content = content.replace(
    /\\begin\{table\}(?:\[(.*?)\])?([\s\S]*?)\\end\{table\}/g,
    (match, placement, tableContent) => {
      let caption = "";
      let label = "";
      let centered = false;
      let result = "<div class='table-container'";

      // Add placement class if specified
      if (placement) {
        result += ` data-placement="${placement}"`;
      }
      result += ">";

      // Check for centering command
      if (tableContent.includes("\\centering")) {
        centered = true;
        // Remove centering command from tableContent to avoid processing it again
        tableContent = tableContent.replace(/\\centering/g, "");
      }

      // Extract caption if present
      const captionMatch = tableContent.match(/\\caption\{(.*?)\}/);
      if (captionMatch) {
        caption = captionMatch[1];
        // Remove caption from tableContent to avoid processing it again
        tableContent = tableContent.replace(/\\caption\{(.*?)\}/g, "");
      }

      // Extract label if present
      const labelMatch = tableContent.match(/\\label\{(.*?)\}/);
      if (labelMatch) {
        label = labelMatch[1];
        // Remove label from tableContent to avoid processing it again
        tableContent = tableContent.replace(/\\label\{(.*?)\}/g, "");
      }

      // Process the tabular environment within the table
      let processedTable = processTabularEnvironment(tableContent);

      // Apply centering if specified
      if (centered) {
        // If the result already contains a table tag, add the class to it
        if (processedTable.includes("<table")) {
          processedTable = processedTable.replace(
            "<table",
            "<table class='centered'"
          );
        }
      }

      result += processedTable;

      // Add caption after the table if present
      if (caption) {
        const id = label ? ` id="${label}"` : "";
        result += `<div class="table-caption"${id}>${caption}</div>`;
      }

      result += "</div>";
      return result;
    }
  );

  // Process standalone tabular environments (not within a table environment)
  content = processTabularEnvironment(content);

  return content;
};

/**
 * Parse LaTeX column specification to determine number of columns and alignments
 */
const parseColumnSpec = (
  spec: string
): { count: number; alignments: string[] } => {
  // Extract column specifiers (l, c, r, p, etc.)
  const alignmentMatches = spec.match(/[lcr]|p\{.*?\}/g) || [];
  const count = alignmentMatches.length || 1; // Default to 1 column if parsing fails

  // Map LaTeX alignment to CSS text-align
  const alignments = alignmentMatches.map((spec) => {
    if (spec === "l") return "left";
    if (spec === "c") return "center";
    if (spec === "r") return "right";
    if (spec.startsWith("p{")) return "left"; // p{width} is paragraph, typically left-aligned
    return "left"; // Default to left alignment for unknown specifiers
  });

  return { count, alignments };
};

/**
 * Process the tabular environment to HTML table
 */
const processTabularEnvironment = (content: string): string => {
  return content.replace(
    /\\begin\{tabular\}\{(.*?)\}([\s\S]*?)\\end\{tabular\}/g,
    (match, columnSpec, tableContent) => {
      // Parse column specification
      const { count, alignments } = parseColumnSpec(columnSpec);

      // Process table content
      let tableHtml = "<table>";

      // Split into rows
      const rows = tableContent.split(/\\\\/).map((row: string) => row.trim());

      // Process each row
      rows.forEach((row: string) => {
        if (row === "") return;

        // Handle \hline
        if (row === "\\hline") {
          tableHtml += "<tr class='hline'></tr>";
          return;
        }

        // Remove leading \hline if present
        let rowContent = row;
        if (rowContent.startsWith("\\hline")) {
          tableHtml += "<tr class='hline'></tr>";
          rowContent = rowContent.substring(6).trim();
        }

        // Skip empty rows
        if (!rowContent) return;

        // Process row content
        tableHtml += "<tr>";
        const cells = rowContent.split(/&/).map((cell: string) => cell.trim());

        cells.forEach((cell: string, index: number) => {
          // Apply the correct alignment for this cell based on column spec
          const align = index < alignments.length ? alignments[index] : "left";
          tableHtml += `<td style="text-align: ${align}">${cell}</td>`;
        });

        // If we have fewer cells than columns, add empty cells
        for (let i = cells.length; i < count; i++) {
          const align = i < alignments.length ? alignments[i] : "left";
          tableHtml += `<td style="text-align: ${align}"></td>`;
        }

        tableHtml += "</tr>";
      });

      tableHtml += "</table>";
      return tableHtml;
    }
  );
};

export default compileLatex;
