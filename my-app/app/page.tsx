"use client";

import { useState } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [creator, setCreator] = useState("Hitesh");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");

  const handleSubmit = async () => {
    if (!question.trim()) return;

    setError(null);
    setAnswer("");

    try {
      setLoading(true);

      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          creator,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setAnswer(data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12">

        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Dev<span className="text-orange-500">Mentor</span>
          </h1>

          <p className="mt-4 text-zinc-400">
            Ask senior developers. Learn from their perspective.
          </p>
        </header>

        {/* Question section */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-2xl">
          <label
            htmlFor="question"
            className="mb-3 block text-sm font-medium text-zinc-300"
          >
            What do you want to know?
          </label>

          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a programming or software engineering question..."
            rows={5}
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />

          {/* Controls */}
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            {/* Creator selector */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Answer from
              </p>

              <div className="flex rounded-lg border border-zinc-700 bg-zinc-950 p-1">
                <button
                  onClick={() => setCreator("Hitesh")}
                  className={`rounded-md px-5 py-2 text-sm font-medium transition ${
                    creator === "Hitesh"
                      ? "bg-orange-500 text-white shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Hitesh
                </button>

                <button
                  onClick={() => setCreator("Piyush")}
                  className={`rounded-md px-5 py-2 text-sm font-medium transition ${
                    creator === "Piyush"
                      ? "bg-orange-500 text-white shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Piyush
                </button>
              </div>
            </div>

            {/* Ask button */}
            <button
              disabled={loading || !question.trim()}
              onClick={handleSubmit}
              className="rounded-lg bg-orange-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Thinking..." : "Ask →"}
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/30 px-5 py-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex items-center gap-3 text-sm text-zinc-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-orange-500" />
            {creator} is thinking...
          </div>
        )}

        {/* Answer */}
        {!loading && answer && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">

            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Response from
                </p>

                <h2 className="mt-1 font-semibold text-orange-400">
                  {creator}
                </h2>
              </div>
            </div>

            <div className="whitespace-pre-wrap px-5 py-6 leading-7 text-zinc-300">
              {answer}
            </div>

          </section>
        )}

        {/* Footer */}
        <footer className="mt-auto pt-12 text-center text-xs text-zinc-600">
          DevMentor · Learn from experienced developers
        </footer>
      </div>
    </main>
  );
}