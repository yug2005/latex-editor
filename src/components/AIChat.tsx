import React, { useState, useRef, useEffect } from "react";
import {
  askAIQuestion,
  AI_MODELS,
  AIModelValue,
} from "../services/aiService";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import LatexEditor from "./LatexEditor";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface AIChatProps {
  onClose: () => void;
  editorContent: string;
  cursorPosition?: number;
}

const AIChat: React.FC<AIChatProps> = ({
  onClose,
  editorContent,
  cursorPosition,
}) => {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
    },
  ]);
  const [activeChat, setActiveChat] = useState<string>("1");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModelValue>("gpt-4o");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  // Ensure input is focused when active chat changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeChat]);

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max height 120px
      textarea.style.height = `${newHeight}px`;
    };

    textarea.addEventListener("input", adjustHeight);
    adjustHeight(); // Initial adjustment

    return () => {
      textarea.removeEventListener("input", adjustHeight);
    };
  }, [inputValue]);

  const getCurrentChat = () => {
    return chats.find((chat) => chat.id === activeChat) || chats[0];
  };

  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
    };
    setChats([...chats, newChat]);
    setActiveChat(newChat.id);
    setInputValue("");
    setIsHistoryOpen(false);
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    // Log cursor position and editor content length for verification
    console.log("[AIChat] Sending message with context:", {
      cursorPosition,
      editorContentLength: editorContent.length,
      question:
        inputValue.substring(0, 50) + (inputValue.length > 50 ? "..." : ""),
      model: selectedModel,
    });

    // Create a copy of chats
    const updatedChats = [...chats];
    const chatIndex = updatedChats.findIndex((chat) => chat.id === activeChat);

    if (chatIndex === -1) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };

    updatedChats[chatIndex].messages.push(userMessage);

    // Update title if this is the first message
    if (updatedChats[chatIndex].messages.length === 1) {
      updatedChats[chatIndex].title =
        inputValue.slice(0, 30) + (inputValue.length > 30 ? "..." : "");
    }

    setChats(updatedChats);
    setInputValue("");
    setIsLoading(true);

    try {
      // Convert previous messages to the format expected by the API
      const previousMessages = updatedChats[chatIndex].messages.map(
        (message) => ({
          role: message.role,
          content: message.content,
        })
      );

      // Get AI response using the askAIQuestion function with previous messages
      const aiResponse = await askAIQuestion({
        question: inputValue,
        documentContent: editorContent,
        cursorPosition: cursorPosition,
        previousMessages: previousMessages.slice(0, -1), // Exclude the message we just added
        model: selectedModel, // Pass the selected model
      });

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: aiResponse,
      };

      const updatedChatsWithResponse = [...updatedChats];
      updatedChatsWithResponse[chatIndex].messages.push(assistantMessage);

      setChats(updatedChatsWithResponse);
    } catch (error) {
      console.error("Error getting AI response:", error);

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };

      const updatedChatsWithResponse = [...updatedChats];
      updatedChatsWithResponse[chatIndex].messages.push(errorMessage);

      setChats(updatedChatsWithResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleHistory = () => {
    setIsHistoryOpen(!isHistoryOpen);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // You could add a toast notification here if desired
        console.log("Content copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  // Helper function to find the model name for display
  const getModelDisplayName = (modelValue: AIModelValue): string => {
    const entry = Object.entries(AI_MODELS).find(
      ([_, value]) => value === modelValue
    );
    return entry ? entry[0] : modelValue;
  };

  // Helper function to parse message content and identify LaTeX code blocks
  const renderMessageContent = (content: string) => {
    const codeBlockRegex = /```latex\s*([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before the code block
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.substring(lastIndex, match.index),
        });
      }

      // Add the LaTeX code block
      parts.push({
        type: "latex",
        content: match[1],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.substring(lastIndex),
      });
    }

    return (
      <>
        {parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <ReactMarkdown key={index} rehypePlugins={[rehypeHighlight]}>
                {part.content}
              </ReactMarkdown>
            );
          } else {
            return (
              <div
                key={index}
                className="my-2 border rounded overflow-hidden dark:border-neutral-700"
              >
                <div className="flex items-center bg-neutral-100 px-2 py-1 border-b dark:bg-neutral-800 dark:border-neutral-700">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    LaTeX Code
                  </span>
                  <button
                    onClick={() => copyToClipboard(part.content)}
                    className="ml-auto text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded flex items-center"
                    title="Copy LaTeX code"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="p-2 pb-0">
                  <LatexEditor
                    value={part.content}
                    onChange={() => {}} // No-op since read-only
                    height="auto"
                    readOnly={true}
                    showToolbar={false}
                    wordWrap={false}
                    fontSize={11}
                    onEditorDidMount={(editor) => {
                      // Get accurate line count
                      const lineCount = part.content.split("\n").length;
                      const lineHeight = 18;
                      const initialHeight = lineCount * lineHeight;
                      // Set initial height
                      editor.getContainerDomNode().style.height = `${initialHeight}px`;
                      editor.layout();
                      // Add a small delay to ensure layout is complete
                      setTimeout(() => {
                        editor.layout();
                      }, 100);
                    }}
                  />
                </div>
              </div>
            );
          }
        })}
      </>
    );
  };

  // Create a list of models for the dropdown
  const modelOptions = Object.entries(AI_MODELS).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="flex flex-col h-full border-t border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between p-2 bg-neutral-100 border-b dark:bg-[#202020] dark:border-neutral-700">
        <h3 className="text-sm font-medium flex-grow overflow-hidden text-ellipsis whitespace-nowrap dark:text-neutral-300">
          Chat with AI Assistant
        </h3>
        <button
          onClick={handleNewChat}
          className="p-1 px-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center text-xs dark:text-neutral-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="align-middle"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button
          onClick={toggleHistory}
          className={`p-1 px-2 mr-2 rounded flex items-center text-xs ${
            isHistoryOpen
              ? "bg-blue-100 dark:bg-neutral-800"
              : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
          } dark:text-neutral-300`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="align-middle"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as AIModelValue)}
            className="text-xs border rounded p-1 bg-white dark:bg-[#252525] dark:text-neutral-300 dark:border-neutral-600"
            title="Select AI model"
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onClose}
          className="p-1 px-2 ml-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 dark:text-neutral-300"
          title="Close chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="align-middle"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Chat history dropdown */}
      {isHistoryOpen && (
        <div className="bg-white border-b shadow-md max-h-60 overflow-y-auto z-10 dark:bg-[#202020] dark:border-neutral-700">
          <div className="p-2 text-xs text-neutral-500 bg-neutral-50 sticky top-0 dark:bg-[#252525] dark:text-neutral-400">
            Chat History
          </div>
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setActiveChat(chat.id);
                setIsHistoryOpen(false);
              }}
              className={`p-2 text-sm truncate cursor-pointer hover:bg-neutral-100 border-b dark:border-neutral-700 dark:hover:bg-neutral-700 ${
                activeChat === chat.id ? "bg-blue-50 dark:bg-[#202020]" : ""
              }`}
              title={chat.title}
            >
              <div className="flex items-center justify-between">
                <span className="truncate dark:text-neutral-300">
                  {chat.title || "New Chat"}
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {chat.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        ref={chatContainerRef}
        className="flex-grow flex flex-col h-0 min-h-0"
      >
        {/* Messages */}
        {getCurrentChat().messages.length > 0 ? (
          <div className="flex-grow p-3 overflow-y-auto bg-white h-0 min-h-0 dark:bg-[#202020]">
            {getCurrentChat().messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.role === "assistant" ? "pr-8" : "pl-8"
                }`}
              >
                <div className="flex items-start">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0 ${
                      message.role === "assistant"
                        ? "bg-blue-500 text-white dark:bg-neutral-600"
                        : "bg-neutral-200 dark:bg-neutral-700"
                    }`}
                  >
                    {message.role === "assistant" ? "AI" : "U"}
                  </div>
                  <div className="flex-grow min-w-0 overflow-hidden">
                    <div className="text-xs font-medium mb-1 flex items-center dark:text-neutral-300">
                      {message.role === "assistant" ? (
                        <>
                          <span>Assistant</span>
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                            {getModelDisplayName(selectedModel)}
                          </span>
                        </>
                      ) : (
                        "You"
                      )}
                    </div>
                    {message.role === "assistant" ? (
                      <div className="text-sm markdown-content prose prose-sm overflow-hidden dark:prose-invert">
                        {renderMessageContent(message.content)}
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => copyToClipboard(message.content)}
                            className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2 py-1 rounded flex items-center dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-300"
                            title="Copy response"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-1"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              ></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap dark:text-neutral-300">
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center text-neutral-500 text-sm dark:text-neutral-400">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white dark:bg-neutral-600 flex items-center justify-center mr-2">
                  AI
                </div>
                <div>
                  <span className="mr-2">Thinking...</span>
                  <span className="text-xs px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                    {getModelDisplayName(selectedModel)}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-grow flex items-end bg-white overflow-auto dark:bg-[#202020]">
            <div className="w-full p-3 text-neutral-400 text-sm dark:text-neutral-500">
              {isLoading && (
                <div className="flex items-center text-neutral-500 text-sm mb-3 dark:text-neutral-400">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white dark:bg-neutral-600 flex items-center justify-center mr-2">
                    AI
                  </div>
                  <div>
                    <span className="mr-2">Thinking...</span>
                    <span className="text-xs px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                      {getModelDisplayName(selectedModel)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input area */}
        <div
          className={`p-3 border-t flex-shrink-0 dark:border-neutral-700 dark:bg-[#202020] ${
            getCurrentChat().messages.length === 0 ? "mt-auto" : ""
          }`}
        >
          <div className="flex items-end">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                getCurrentChat().messages.length === 0
                  ? "Ask any question about your document..."
                  : "Ask a follow-up question..."
              }
              className="flex-grow p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-neutral-500 overflow-auto text-sm dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-200 dark:placeholder-neutral-400"
              rows={1}
              style={{ minHeight: "60px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`ml-2 p-2 rounded-lg ${
                !inputValue.trim() || isLoading
                  ? "bg-neutral-300 text-neutral-500 dark:bg-neutral-600 dark:text-neutral-400"
                  : "bg-blue-500 text-white hover:bg-blue-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
