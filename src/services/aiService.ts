import OpenAI from "openai";

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
      model: "gpt-4o-mini",
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
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>;
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
    contentLength: options.documentContent.length,
    cursorPosition: options.cursorPosition,
    hasHistory: options.previousMessages && options.previousMessages.length > 0,
    model: options.model || "gpt-4o",
  });

  const {
    question,
    documentContent,
    cursorPosition,
    maxTokens = 500,
    temperature = 0.7,
    previousMessages = [],
    model = "gpt-4o", // Default to GPT-4o
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
      documentContext.length,
      "and previous messages:",
      previousMessages.length
    );

    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.error(
        "[AIService] No API key found. Please set REACT_APP_OPENAI_API_KEY in .env file"
      );
      return "⚠️ API key missing";
    }

    // Build the messages array for the API call
    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Add document context as a system message if available
    if (documentContext.trim()) {
      messages.push({
        role: "system",
        content: `Document context:\n\n${documentContext}`,
      });
    }

    // Add previous conversation history
    if (previousMessages.length > 0) {
      messages.push(...previousMessages);
    }

    // Add the current question
    messages.push({
      role: "user",
      content: question,
    });

    // Check if the model is a new reasoning model that uses different parameters
    const isReasoningModel = model === "o1" || model === "o3-mini";

    // Create the request options based on the model type
    let requestOptions;

    if (isReasoningModel) {
      // For o1 and o3-mini models, use minimal parameters since many standard ones aren't supported
      requestOptions = {
        model: model,
        messages: messages,
        // These models may not support additional parameters, so we're providing just the essentials
      };
    } else if (model === "gpt-4.5-preview") {
      // For preview models, they might have different parameter requirements
      requestOptions = {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
      };
    } else {
      // For standard GPT models
      requestOptions = {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0.3,
      };
    }

    console.log(
      "[AIService] Request options for model",
      model,
      ":",
      JSON.stringify(requestOptions, null, 2)
    );

    const response = await openai.chat.completions.create(requestOptions);

    const answer = response.choices[0]?.message.content || "";
    console.log(
      "[AIService] Received answer from model " + model + ":",
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
