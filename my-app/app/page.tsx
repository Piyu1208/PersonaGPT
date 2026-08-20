"use client";

import { useEffect, useRef, useState } from "react";

type Creator = "hitesh" | "piyush";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [creator, setCreator] = useState<Creator>("hitesh");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Automatically scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);


  const handleContext = async () => {
    
  }

  const handleSubmit = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) return;

    setError(null);
    setQuestion("");

    const userMessage: Message = {
      role: "user",
      content: trimmedQuestion,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          creator,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,

      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    if (loading) return;

    setMessages([]);
    setError(null);
    setQuestion("");
    textareaRef.current?.focus();
  };

  return (
    <main className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 px-5">
          <div>
            <h1 className="text-lg font-semibold">
              Dev<span className="text-orange-500">Mentor</span>
            </h1>

            <p className="hidden text-xs text-zinc-500 sm:block">
              Learn from experienced developers
            </p>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              disabled={loading}
              className="rounded-lg px-3 py-2 text-xs text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              New chat
            </button>
          )}
        </header>

        {/* Chat */}
        <div className="scrollbar-hide flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-3xl">
                  👨‍💻
                </div>

                <h2 className="text-2xl font-semibold">
                  How can I help you?
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">
                  Ask a programming, software engineering, or
                  career question and get an answer from your
                  chosen mentor.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {[
                    "Explain React hooks",
                    "How should I learn backend?",
                    "What is system design?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setQuestion(suggestion);
                        textareaRef.current?.focus();
                      }}
                      className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-8">
              {messages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={index}
                    className={`flex gap-4 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Assistant avatar */}
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                        {JSON.parse(message.content).creator === "Piyush" ? "P" : "H"}
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Creator name */}
                      {!isUser && (
                        <div className="mb-1 text-xs font-medium text-orange-400">
                          {JSON.parse(message.content).creator}
                        </div>
                      )}

                      {/* Message */}
                      <div
                        className={
                          isUser
                            ? "rounded-2xl rounded-br-md bg-zinc-800 px-4 py-3 text-sm leading-6 text-zinc-100"
                            : "text-sm leading-7 text-zinc-300"
                        }
                      >
                        <div className="whitespace-pre-wrap">
                          {isUser ? message.content: JSON.parse(message.content).answer}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Loading */}
              {loading && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                    {creator === "piyush" ? "P" : "H"}
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-medium text-orange-400">
                      {creator === "piyush" ? "Piyush" : "Hitesh"}
                    </div>

                    <div className="flex items-center gap-1.5 py-2">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {error && (
              <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 pb-4 pt-3">
          <div className="mx-auto max-w-3xl">
            {/* Creator selector */}
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-zinc-600">
                Mentor:
              </span>

              <button
                type="button"
                disabled={loading}
                onClick={() => setCreator("hitesh")}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  creator === "hitesh"
                    ? "bg-orange-500/15 text-orange-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Hitesh
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => setCreator("piyush")}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  creator === "piyush"
                    ? "bg-orange-500/15 text-orange-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Piyush
              </button>
            </div>

            {/* Input */}
            <div className="relative rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl transition focus-within:border-zinc-600">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
                placeholder={`Message ${creator === "hitesh" ? "Hitesh" : "Piyush"}...`}
                className="max-h-48 min-h-[56px] w-full resize-none bg-transparent px-4 py-4 pr-14 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed"
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !question.trim()}
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
                aria-label="Send message"
              >
                ↑
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-zinc-700">
              Enter to send · Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}