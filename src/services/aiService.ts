import OpenAI from "openai";
import { latexParser } from "latex-utensils";
import { LatexNode } from "../utils/latexAST";
import { EditChange } from "../utils/editGroupsTracking";

// Define available OpenAI models
export const AI_MODELS = {
  "GPT-3.5": "gpt-3.5-turbo",
  "GPT-4": "gpt-4-turbo",
  "GPT-4o": "gpt-4o",
  "GPT-4o-mini": "gpt-4o-mini",
  "GPT-4.5 Preview": "gpt-4.5-preview",
  "GPT-o1": "o1",
  "GPT-o3-mini": "o3-mini",
} as const;

export type AIModelKey = keyof typeof AI_MODELS;
export type AIModelValue = (typeof AI_MODELS)[AIModelKey];

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

// Additional context information type
export interface LatexContext {
  currentNode: LatexNode;
  documentAST: latexParser.LatexAst;
  documentContent: string;
  cursorOffset: number;
  prefix?: string; // Text before cursor on the current line
  visibleContent?: string;
  recentEdits?: EditChange[];
  currentWord?: string;
  surroundingEnvironment?: string;
}

export interface AISuggestionOptions {
  context: LatexContext;
  maxTokens?: number;
  temperature?: number;
}

export enum LatexContextType {
  PARAGRAPH = "paragraph", // Regular text
  SECTION = "section", // Inside a section
  SUBSECTION = "subsection", // Inside a subsection
  SUBSUBSECTION = "subsubsection", // Inside a subsubsection
  MATH_INLINE = "math.inline", // Inline math ($...$)
  MATH_DISPLAY = "math.display", // Display math ($$...$$)
  MATH_ENVIRONMENT = "math.environment", // Math environments (align, equation, etc)
  ITEMIZE = "itemize", // Itemize environment
  ENUMERATE = "enumerate", // Enumerate environment
  TABLE = "table", // Table environment
  FIGURE = "figure", // Figure environment
  COMMAND = "command", // Inside a LaTeX command
  COMMENT = "comment", // Inside a comment
  UNKNOWN = "unknown", // Couldn't determine the context
}

// Determine context type based on the node and its ancestors
const determineContextType = (node: LatexNode): LatexContextType => {
  if (!node) return LatexContextType.UNKNOWN;
  // Check for math environments
  if (node.kind === "inlineMath") {
    return LatexContextType.MATH_INLINE;
  }
  if (node.kind === "displayMath") {
    return LatexContextType.MATH_DISPLAY;
  }
  if (
    node.kind &&
    typeof node.kind === "string" &&
    node.kind.startsWith("env.math.")
  ) {
    return LatexContextType.MATH_ENVIRONMENT;
  }
  // Check for section, subsection, subsubsection
  if (node.kind === "section") {
    return LatexContextType.SECTION;
  }
  if (node.kind === "subsection") {
    return LatexContextType.SUBSECTION;
  }
  if (node.kind === "subsubsection") {
    return LatexContextType.SUBSUBSECTION;
  }
  // Check for command
  if (node.kind === "command") {
    return LatexContextType.COMMAND;
  }
  // Check for environments
  if (
    node.kind === "env" ||
    (node.kind &&
      typeof node.kind === "string" &&
      node.kind.startsWith("env."))
  ) {
    if ("name" in node && typeof node.name === "string") {
      const envName = String(node.name).toLowerCase();
      switch (envName) {
        case "itemize":
          return LatexContextType.ITEMIZE;
        case "enumerate":
          return LatexContextType.ENUMERATE;
        case "table":
        case "tabular":
          return LatexContextType.TABLE;
        case "figure":
          return LatexContextType.FIGURE;
        // Add other specific environments as needed
      }
    }
  }
  // If we haven't determined the context and the node has a parent, check the parent
  if (node.parent) {
    return determineContextType(node.parent);
  }
  // Default to paragraph if we couldn't determine a more specific context
  return LatexContextType.PARAGRAPH;
};

/**
 * Get AI-powered LaTeX suggestions based on document context and cursor position
 */
export const getLatexSuggestions = async (
  options: AISuggestionOptions
): Promise<string> => {
  console.log(
    "[AIService] getLatexSuggestions called with context:",
    options.context
  );

  const { context, maxTokens = 150, temperature = 0.7 } = options;
  const { currentNode, documentAST, documentContent, cursorOffset, prefix } = context;
  
  console.log("[AIService] Current node:", currentNode);
  console.log("[AIService] Document AST:", documentAST);

  // Get text before and after cursor to provide complete context
  const contextBeforeCursor = documentContent.substring(0, cursorOffset);
  const contextAfterCursor = documentContent.substring(cursorOffset);

  // Analyze the context to determine what type of suggestion to provide
  const contextType = determineContextType(currentNode);
  console.log("[AIService] Context Type:", contextType);

  let systemPrompt =
    "You are a LaTeX expert assistant. Based on the context and the cursor position indicated by [CURSOR], provide a LaTeX completion for the user.";

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

    // Build the user message with enhanced context
    let userMessage = `Complete this LaTeX at the cursor position marked by [CURSOR]. Consider both the text before and after the cursor for context. Only provide the suggested completion text (no explanations):
    
${contextBeforeCursor}[CURSOR]${contextAfterCursor}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: maxTokens,
      temperature: temperature,
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

export interface AIChatContext {
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  documentAST?: latexParser.LatexAst;
  documentContent?: string;
  cursorOffset?: number;
  prefix?: string; // Text before cursor on the current line
  visibleContent?: string;
  recentEdits?: EditChange[];
  currentWord?: string;
  surroundingEnvironment?: string;
}

export interface AIQuestionOptions {
  question: string;
  context: AIChatContext;
  maxTokens?: number;
  temperature?: number;
  model?: AIModelValue;
}

/**
 * Ask AI a direct question with document context
 */
export const askAIQuestion = async (
  options: AIQuestionOptions
): Promise<string> => {
  console.log("[AIService] askAIQuestion called with options:", {
    question: options.question,
    context: options.context,
    hasHistory:
      options.context.previousMessages &&
      options.context.previousMessages.length > 0,
    model: options.model || "gpt-4o",
  });

  const {
    question,
    context,
    maxTokens = 500,
    temperature = 0.7,
    model = "gpt-4o", // Default to GPT-4o
  } = options;
  const { documentContent, cursorOffset } = context;

  // Extract the context around cursor position if provided
  let documentContext = documentContent;
  if (documentContent && cursorOffset !== undefined) {
    // Get text before and after cursor to provide focused context
    const startPosition = Math.max(0, cursorOffset - 2000);
    const endPosition = Math.min(documentContent.length, cursorOffset + 2000);
    documentContext = documentContent.substring(startPosition, endPosition);
  }

  const systemPrompt = `You are an expert LaTeX assistant helping users with their LaTeX documents. 
You can provide detailed explanations, fix issues, and give examples on how to use LaTeX effectively.
Your answers should be clear, technically accurate, and tailored to help the user solve their specific problem.
Focus on providing practical, usable LaTeX code when appropriate.`;

  try {
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.error(
        "[AIService] No API key found. Please set REACT_APP_OPENAI_API_KEY in .env file"
      );
      return "⚠️ API key missing. Please set up your OpenAI API key in the .env file.";
    }

    // Define the message type explicitly
    type ChatMessage = {
      role: "system" | "user" | "assistant";
      content: string;
    };

    // Build messages including context and history
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Add previous conversation messages if they exist
    if (context.previousMessages && context.previousMessages.length > 0) {
      // Add previous messages to maintain conversation context
      messages.push(...(context.previousMessages as ChatMessage[]));
    }

    // Prepare the context message with document content
    let contextMessage = `I'm working on this LaTeX document:

\`\`\`latex
${documentContext}
\`\`\``;

    // Add cursor position information if available
    if (cursorOffset !== undefined) {
      contextMessage += `\nMy cursor is currently at position ${cursorOffset}.`;
    }

    // Add the context message and the user's question
    messages.push(
      {
        role: "user",
        content: contextMessage,
      },
      {
        role: "user",
        content: question,
      }
    );

    console.log(
      "[AIService] Sending request to OpenAI with model:",
      model,
      "and messages count:",
      messages.length
    );

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const answer = response.choices[0]?.message.content || "";
    return answer;
  } catch (error) {
    console.error("[AIService] Error in askAIQuestion:", error);
    return `⚠️ Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};
