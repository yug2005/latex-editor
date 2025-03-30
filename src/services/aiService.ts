import OpenAI from "openai";

// Initialize OpenAI client
// You'll need to set REACT_APP_OPENAI_API_KEY in your .env file
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for development, consider a backend proxy for production
});

console.log(
  "[AIService] Initialized with API key:",
  process.env.REACT_APP_OPENAI_API_KEY ? "API key exists" : "Missing API key"
);

export interface AISuggestionOptions {
  documentContent: string;
  cursorPosition: number;
  prefix?: string; // Text before cursor on the current line
  maxTokens?: number;
  temperature?: number;
}

/**
 * Analyzes the context to determine if we're in LaTeX command mode or prose/paragraph mode
 */
const analyzeContext = (
  content: string,
  cursorPosition: number
): {
  isCommand: boolean;
  contextType: "math" | "command" | "prose" | "environment";
} => {
  // Get line and character before cursor
  const beforeCursor = content.substring(0, cursorPosition);
  const lines = beforeCursor.split("\n");
  const currentLine = lines[lines.length - 1] || "";

  // Check if we're in a math environment
  const mathStart = Math.max(
    beforeCursor.lastIndexOf("$$"),
    beforeCursor.lastIndexOf("\\begin{equation}"),
    beforeCursor.lastIndexOf("\\begin{align}"),
    beforeCursor.lastIndexOf("$")
  );

  const mathEnd = Math.max(
    beforeCursor.lastIndexOf("$$", mathStart - 1),
    beforeCursor.lastIndexOf("\\end{equation}"),
    beforeCursor.lastIndexOf("\\end{align}"),
    beforeCursor.lastIndexOf("$", mathStart - 1)
  );

  const inMathEnv = mathStart > mathEnd;

  // Check if we're inside a command
  const lastBackslash = currentLine.lastIndexOf("\\");
  const insideCommand =
    lastBackslash >= 0 &&
    !currentLine.substring(lastBackslash).includes("{") &&
    !currentLine.substring(lastBackslash).includes(" ");

  // Check if we're inside a LaTeX environment content
  const environmentStart = beforeCursor.lastIndexOf("\\begin{");
  const environmentEnd = beforeCursor.lastIndexOf("\\end{");
  const inEnvironment = environmentStart > environmentEnd;

  // Let's see if there's a paragraph of text
  const lastFewLines = lines.slice(-5).join("\n");
  const hasParagraphText =
    !lastFewLines.includes("\\") ||
    (lastFewLines.split(/[^\\]/).length - 1) / lastFewLines.length < 0.2; // Less than 20% LaTeX commands

  let contextType: "math" | "command" | "prose" | "environment";
  let isCommand: boolean;

  if (insideCommand) {
    contextType = "command";
    isCommand = true;
  } else if (inMathEnv) {
    contextType = "math";
    isCommand = true;
  } else if (inEnvironment && !hasParagraphText) {
    contextType = "environment";
    isCommand = false;
  } else {
    contextType = "prose";
    isCommand = false;
  }

  console.log("[AIService] Analyzed context:", {
    contextType,
    isCommand,
    inMathEnv,
    insideCommand,
    inEnvironment,
    hasParagraphText,
  });

  return { isCommand, contextType };
};

/**
 * Get AI-powered LaTeX suggestions based on document context and cursor position
 */
export const getLatexSuggestions = async (
  options: AISuggestionOptions
): Promise<string> => {
  console.log("[AIService] getLatexSuggestions called with options:", {
    contentLength: options.documentContent.length,
    cursorPosition: options.cursorPosition,
    prefixLength: options.prefix?.length,
  });

  const {
    documentContent,
    cursorPosition,
    prefix = "",
    maxTokens = 150,
    temperature = 0.7,
  } = options;

  // Get text before and after cursor to provide complete context
  const contextBeforeCursor = documentContent.substring(0, cursorPosition);
  const contextAfterCursor = documentContent.substring(cursorPosition);

  // Analyze the context to determine what type of suggestion to provide
  const contextAnalysis = analyzeContext(documentContent, cursorPosition);

  // Set up appropriate system prompt based on context
  let systemPrompt = "";
  if (contextAnalysis.contextType === "command") {
    systemPrompt = `You are a LaTeX expert assistant that provides command completions. 
When the user is writing a LaTeX command (after a backslash), provide only the command name without explanations or the backslash.`;
  } else if (contextAnalysis.contextType === "math") {
    systemPrompt = `You are a LaTeX math expert. Complete the mathematical expression started by the user.
Provide only the math LaTeX code to continue, no explanations.`;
  } else if (contextAnalysis.contextType === "environment") {
    systemPrompt = `You are a LaTeX environment expert. Complete the content within this LaTeX environment.
Focus on providing appropriate content for this specific environment type.`;
  } else {
    // Prose mode
    systemPrompt = `You are a LaTeX writing assistant helping complete paragraphs and prose.
For text paragraphs (not LaTeX commands), provide thoughtful, medium to long-length completions.
For text, focus on continuing the user's writing style, arguments, and thought process.`;
  }

  try {
    console.log(
      "[AIService] Making API request with system prompt:",
      systemPrompt.substring(0, 100) + "..."
    );

    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.error(
        "[AIService] No API key found. Please set REACT_APP_OPENAI_API_KEY in .env file"
      );
      return "⚠️ API key missing";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Complete this LaTeX at the cursor position marked by [CURSOR]. Consider both the text before and after the cursor for context. Only provide the suggested completion text (no explanations):
          
${contextBeforeCursor}[CURSOR]${contextAfterCursor}`,
        },
      ],
      max_tokens:
        contextAnalysis.contextType === "prose" ? maxTokens * 2 : maxTokens,
      temperature:
        contextAnalysis.contextType === "command" ? 0.2 : temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.3,
    });

    const suggestion = response.choices[0]?.message.content || "";
    console.log(
      "[AIService] Received suggestion:",
      suggestion.substring(0, 100) + (suggestion.length > 100 ? "..." : "")
    );
    return suggestion;
  } catch (error) {
    console.error("[AIService] Error getting AI suggestions:", error);
    return `⚠️ Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};

export interface AIQuestionOptions {
  question: string;
  documentContent: string;
  cursorPosition?: number;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Ask AI a direct question with document context
 */
export const askAIQuestion = async (
  options: AIQuestionOptions
): Promise<string> => {
  console.log("[AIService] askAIQuestion called with options:", {
    question: options.question,
    contentLength: options.documentContent.length,
    cursorPosition: options.cursorPosition,
  });

  const {
    question,
    documentContent,
    cursorPosition,
    maxTokens = 500,
    temperature = 0.7,
  } = options;

  // Extract the context around cursor position if provided
  let documentContext = documentContent;
  if (cursorPosition !== undefined) {
    // Get text before and after cursor to provide focused context
    const startPosition = Math.max(0, cursorPosition - 2000);
    const endPosition = Math.min(documentContent.length, cursorPosition + 2000);
    documentContext = documentContent.substring(startPosition, endPosition);

    // Log detailed cursor position information
    console.log("[AIService] Using cursor context:", {
      documentLength: documentContent.length,
      cursorPosition,
      contextWindowStart: startPosition,
      contextWindowEnd: endPosition,
      contextLength: documentContext.length,
      textAtCursor: documentContent.substring(
        Math.max(0, cursorPosition - 20),
        Math.min(documentContent.length, cursorPosition + 20)
      ),
    });
  }

  const systemPrompt = `You are a helpful LaTeX and document editing assistant.
Answer questions about LaTeX, document structure, content, or provide suggestions based on the document context.
Be concise, accurate, and directly address the user's question.
Always format your responses using markdown, including proper formatting for code blocks, headings, lists, and other elements.`;

  try {
    console.log(
      "[AIService] Making AI question API request with context length:",
      documentContext.length
    );

    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.error(
        "[AIService] No API key found. Please set REACT_APP_OPENAI_API_KEY in .env file"
      );
      return "⚠️ API key missing";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Document context:\n\n${documentContext}\n\nQuestion: ${question}`,
        },
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.3,
    });

    const answer = response.choices[0]?.message.content || "";
    console.log(
      "[AIService] Received answer:",
      answer.substring(0, 100) + (answer.length > 100 ? "..." : "")
    );
    return answer;
  } catch (error) {
    console.error("[AIService] Error getting AI answer:", error);
    return `⚠️ Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};
