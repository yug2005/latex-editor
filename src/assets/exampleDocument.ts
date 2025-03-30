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

\\section{Binary Linear Classification}
In binary linear classification, we wish to separate two classes of data points using a linear decision boundary. Given a dataset of $N$ examples, where each example is represented by a feature vector $\\mathbf{x}_i \\in \\mathbb{R}^d$ and a label $y_i \\in \\{-1, +1\\}$, we seek a weight vector $\\mathbf{w}$ such that the decision function
\\[
f(\\mathbf{x}) = \\text{sign}(\\mathbf{w}^T \\mathbf{x})
\\]
correctly classifies the data.

\\subsection{Loss Function}
A common loss function used in the context of the Perceptron is the \\emph{perceptron loss}. For a misclassified point (i.e., a point for which $y_i (\\mathbf{w}^T \\mathbf{x}_i) \\leq 0$), the loss is defined as:
\\[
\\ell(\\mathbf{w}; \\mathbf{x}_i, y_i) = -y_i (\\mathbf{w}^T \\mathbf{x}_i).
\\]
The overall loss is often taken as the sum over all misclassified points:
\\[
L(\\mathbf{w}) = \\sum_{i \\in \\mathcal{M}} -y_i (\\mathbf{w}^T \\mathbf{x}_i),
\\]
where $\\mathcal{M}$ is the set of indices corresponding to misclassified examples. This loss function drives the weight updates so that the decision boundary gradually aligns with the separation between classes.

\\subsection{Perceptron Learning Algorithm (PLA)}
The Perceptron Learning Algorithm is an iterative method for finding a suitable weight vector $\\mathbf{w}$ that separates the data. The algorithm proceeds as follows:
\\begin{enumerate}
    \\item Initialize the weight vector $\\mathbf{w}$ (often with zeros or small random values).
    \\item For each example $(\\mathbf{x}_i, y_i)$, check if it is correctly classified, i.e., whether $y_i (\\mathbf{w}^T \\mathbf{x}_i) > 0$.
    \\item If an example is misclassified, update the weight vector using:
    \\[
    \\mathbf{w} \\leftarrow \\mathbf{w} + y_i \\mathbf{x}_i.
    \\]
    \\item Repeat this process until all examples are classified correctly or a maximum number of iterations is reached.
\\end{enumerate}
This algorithm works well when the data is linearly separable. However, if the data is not perfectly separable or if there is noise, the algorithm might never converge.

\\subsection{The Pocket Algorithm}
When dealing with non-separable data, the standard PLA might cycle indefinitely without finding a perfect solution. The pocket algorithm modifies PLA to handle such situations:
\\begin{enumerate}
    \\item Run the PLA as usual, but maintain a "pocket" that stores the best weight vector found so far, based on a performance metric (typically the number of misclassified points or an aggregate error measure).
    \\item At each update, if the current weight vector \\(\\mathbf{w}\\) yields a lower error than the best weight vector in the pocket, update the pocket with \\(\\mathbf{w}\\).
    \\item Continue for a predefined number of iterations or until no improvement is observed.
\\end{enumerate}
The key idea of the pocket algorithm is that, even when an ideal solution cannot be reached, the algorithm "remembers" the best performing solution encountered during training.

These methodologies are fundamental in understanding binary linear classification, especially in introductory machine learning contexts.

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
