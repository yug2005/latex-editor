import OpenAI from "openai";
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

/**
 * Analyzes the context to determine if we're in LaTeX command mode or prose/paragraph mode
 */
const analyzeContext = (
  content: string,
  cursorOffset: number
): {
  isCommand: boolean;
  contextType: "math" | "command" | "prose" | "environment";
} => {
  // Get line and character before cursor
  const beforeCursor = content.substring(0, cursorOffset);
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
  console.log(
    "[AIService] getLatexSuggestions called with context:",
    options.context
  );

  const { context, maxTokens = 150, temperature = 0.7 } = options;
  const { documentContent, cursorOffset, prefix } = context;

  // Get text before and after cursor to provide complete context
  const contextBeforeCursor = documentContent.substring(0, cursorOffset);
  const contextAfterCursor = documentContent.substring(cursorOffset);

  // Analyze the context to determine what type of suggestion to provide
  const contextAnalysis = analyzeContext(documentContent, cursorOffset);

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

export interface ChatContext {
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AIQuestionOptions {
  question: string;
  context: LatexContext;
  chatContext: ChatContext;
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
    hasHistory: options.chatContext.previousMessages && options.chatContext.previousMessages.length > 0,
    model: options.model || "gpt-4o",
  });

  const {
    question,
    context,
    chatContext,
    maxTokens = 500,
    temperature = 0.7,
    model = "gpt-4o", // Default to GPT-4o
  } = options;
  const { documentContent, cursorOffset } = context;

  // Extract the context around cursor position if provided
  let documentContext = documentContent;
  if (cursorOffset !== undefined) {
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
    if (chatContext.previousMessages && chatContext.previousMessages.length > 0) {
      // Add previous messages to maintain conversation context
      messages.push(...(chatContext.previousMessages as ChatMessage[]));
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
