// Sample LaTeX document with various elements
export const EXAMPLE_DOCUMENT = `\\documentclass{article}
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


\\section{Tables}
Here is a simple table with random columns and values:

\\begin{table}[h]
    \\centering
    \\begin{tabular}{|l|c|r|}
        \\hline
        Column 1 & Column 2 & Column 3 \\\\ \\hline
        A        & B        & C        \\\\ \\hline
        1.23     & 4.56     & 7.89     \\\\ \\hline
        X        & Y        & Z        \\\\ \\hline
        W        & 3.14     & 2.71     \\\\ \\hline
        New & Data & Entry \\\\ \\hline
    \\end{tabular}
    \\caption{A simple table with random data.}
    \\label{tab:random}
\\end{table}

\\end{document}`;

// Default starter document (simplified version)
export const DEFAULT_DOCUMENT = `\\documentclass{article}
\\begin{document}
Hello, LaTeX!
\\end{document}`;
