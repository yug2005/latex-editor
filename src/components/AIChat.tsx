import React, { useState, useRef, useEffect } from "react";
import { askAIQuestion } from "../services/aiService";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

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
      // Get AI response using the new askAIQuestion function
      const aiResponse = await askAIQuestion({
        question: inputValue,
        documentContent: editorContent,
        cursorPosition: cursorPosition,
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

  return (
    <div className="flex flex-col h-full border-t border-gray-200">
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium">Chat with AI Assistant</h3>
          <div className="flex space-x-1">
            <button
              onClick={handleNewChat}
              className="p-1 rounded hover:bg-gray-200 flex items-center text-xs"
              title="New Chat"
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
                className="mr-1"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New
            </button>
            <button
              onClick={toggleHistory}
              className={`p-1 rounded flex items-center text-xs ${
                isHistoryOpen ? "bg-blue-100" : "hover:bg-gray-200"
              }`}
              title="View Chat History"
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
                className="mr-1"
              >
                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                <line x1="9" y1="20" x2="15" y2="20"></line>
                <line x1="12" y1="4" x2="12" y2="20"></line>
              </svg>
              History
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200"
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
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Chat history dropdown */}
      {isHistoryOpen && (
        <div className="bg-white border-b shadow-md max-h-60 overflow-y-auto z-10">
          <div className="p-2 text-xs text-gray-500 bg-gray-50 sticky top-0">
            Chat History
          </div>
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setActiveChat(chat.id);
                setIsHistoryOpen(false);
              }}
              className={`p-2 text-sm truncate cursor-pointer hover:bg-gray-100 border-b ${
                activeChat === chat.id ? "bg-blue-50" : ""
              }`}
              title={chat.title}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{chat.title || "New Chat"}</span>
                <span className="text-xs text-gray-400">
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
          <div className="flex-grow p-3 overflow-y-auto bg-white h-0 min-h-0">
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
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {message.role === "assistant" ? "AI" : "U"}
                  </div>
                  <div className="flex-grow min-w-0 overflow-hidden">
                    <div className="text-xs font-medium mb-1">
                      {message.role === "assistant" ? "Assistant" : "You"}
                    </div>
                    {message.role === "assistant" ? (
                      <div className="text-sm markdown-content prose prose-sm overflow-hidden">
                        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                          {message.content}
                        </ReactMarkdown>
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => copyToClipboard(message.content)}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center"
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
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center text-gray-500 text-sm">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2">
                  AI
                </div>
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-grow flex items-end bg-white overflow-auto">
            <div className="w-full p-3 text-gray-400 text-sm">
              {isLoading && (
                <div className="flex items-center text-gray-500 text-sm mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2">
                    AI
                  </div>
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input area */}
        <div
          className={`p-3 border-t flex-shrink-0 ${
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
              className="flex-grow p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-auto"
              rows={1}
              style={{ minHeight: "75px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`ml-2 p-2 rounded-lg ${
                !inputValue.trim() || isLoading
                  ? "bg-gray-300 text-gray-500"
                  : "bg-blue-500 text-white hover:bg-blue-600"
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
