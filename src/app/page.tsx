"use client";

import { useState, useCallback } from "react";
import { FlipBook } from "@/components/FlipBook";
import { LoadingProgress } from "@/components/LoadingProgress";
import { useStoryGeneration } from "@/hooks/useStoryGeneration";
import type { StoryOptions, GeneratedStory } from "@/types/story";
import { PAGE_COUNTS } from "@/types/story";

export default function Home() {
  const [options, setOptions] = useState<StoryOptions>({
    childName: "",
    age: "toddler",
    length: "medium",
    theme: "adventure",
    tone: "soothing",
    rhyming: false,
  });

  const [story, setStory] = useState<GeneratedStory | null>(null);
  const { generate, loadingState, error, reset, retryImage } =
    useStoryGeneration();

  const handleGenerate = async () => {
    const generatedStory = await generate(options);
    if (generatedStory) {
      setStory(generatedStory);
    }
  };

  const handleNewStory = () => {
    setStory(null);
    reset();
  };

  const handleRetryImage = useCallback(
    async (pageNumber: number) => {
      if (!story) return;
      const updatedPage = await retryImage(story, pageNumber, options);
      if (updatedPage) {
        // Force re-render with updated story
        setStory({ ...story });
      }
    },
    [story, options, retryImage]
  );

  const isLoading =
    loadingState.stage === "generating-story" ||
    loadingState.stage === "generating-images";

  // Get page count for display
  const pageCount = PAGE_COUNTS[options.length as keyof typeof PAGE_COUNTS] || 7;

  return (
    <main className="min-h-screen px-4 py-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <div className="inline-block mb-4">
            <span className="text-5xl">🌙</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-dream-gold via-dream-pink to-dream-purple bg-clip-text text-transparent">
            Dreamweaver Stories
          </h1>
          <p className="text-night-200 text-lg md:text-xl max-w-2xl mx-auto">
            Create magical, personalized bedtime picture books for your little
            ones
          </p>
        </header>

        {/* Form - shown when no story and not loading */}
        {!story && !isLoading && (
          <div className="dream-card bg-night-900/60 rounded-3xl p-6 md:p-10 border border-night-700/50 animate-slide-up">
            <div className="grid gap-6 md:gap-8">
              {/* Child's Name */}
              <div className="space-y-2">
                <label className="block text-dream-gold font-medium text-sm uppercase tracking-wider">
                  Child&apos;s Name{" "}
                  <span className="text-night-400 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={options.childName}
                  onChange={(e) =>
                    setOptions({ ...options, childName: e.target.value })
                  }
                  placeholder="Enter name to personalize the story"
                  className="dream-input w-full bg-night-800/50 border border-night-600/50 rounded-xl px-5 py-4 text-white placeholder-night-400 transition-all"
                />
              </div>

              {/* Age & Length Row */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-dream-gold font-medium text-sm uppercase tracking-wider">
                    Age Group
                  </label>
                  <select
                    value={options.age}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        age: e.target.value as StoryOptions["age"],
                      })
                    }
                    className="dream-select w-full bg-night-800/50 border border-night-600/50 rounded-xl px-5 py-4 text-white transition-all cursor-pointer"
                  >
                    <option value="baby">Baby (0-1 years)</option>
                    <option value="toddler">Toddler (2-3 years)</option>
                    <option value="preschool">Preschool (4-5 years)</option>
                    <option value="early-reader">Early Reader (6-8 years)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-dream-gold font-medium text-sm uppercase tracking-wider">
                    Book Length
                  </label>
                  <select
                    value={options.length}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        length: e.target.value as StoryOptions["length"],
                      })
                    }
                    className="dream-select w-full bg-night-800/50 border border-night-600/50 rounded-xl px-5 py-4 text-white transition-all cursor-pointer"
                  >
                    <option value="short">Short (5 pages)</option>
                    <option value="medium">Medium (7 pages)</option>
                    <option value="long">Long (10 pages)</option>
                  </select>
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <label className="block text-dream-gold font-medium text-sm uppercase tracking-wider">
                  Story Theme
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: "adventure", label: "Adventure", emoji: "🗺️" },
                    { value: "animals", label: "Animals", emoji: "🦊" },
                    { value: "fantasy", label: "Fantasy", emoji: "🧚" },
                    { value: "space", label: "Space", emoji: "🚀" },
                    { value: "friendship", label: "Friendship", emoji: "💕" },
                    { value: "silly", label: "Silly", emoji: "🤪" },
                    { value: "nature", label: "Nature", emoji: "🌿" },
                    { value: "ocean", label: "Ocean", emoji: "🐙" },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() =>
                        setOptions({
                          ...options,
                          theme: theme.value as StoryOptions["theme"],
                        })
                      }
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        options.theme === theme.value
                          ? "border-dream-purple bg-dream-purple/20 shadow-lg shadow-dream-purple/20"
                          : "border-night-600/50 bg-night-800/30 hover:border-night-500"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{theme.emoji}</span>
                      <span className="text-sm font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone & Rhyming Row */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-dream-gold font-medium text-sm uppercase tracking-wider">
                    Story Tone
                  </label>
                  <div className="flex gap-3">
                    {[
                      {
                        value: "soothing",
                        label: "Soothing 😴",
                        desc: "Calm & peaceful",
                      },
                      {
                        value: "exciting",
                        label: "Exciting ⚡",
                        desc: "Fun & energetic",
                      },
                    ].map((tone) => (
                      <button
                        key={tone.value}
                        onClick={() =>
                          setOptions({
                            ...options,
                            tone: tone.value as StoryOptions["tone"],
                          })
                        }
                        className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${
                          options.tone === tone.value
                            ? "border-dream-purple bg-dream-purple/20"
                            : "border-night-600/50 bg-night-800/30 hover:border-night-500"
                        }`}
                      >
                        <span className="block font-medium">{tone.label}</span>
                        <span className="text-xs text-night-300">
                          {tone.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-dream-gold font-medium text-sm uppercase tracking-wider">
                    Make it Rhyme?
                  </label>
                  <button
                    onClick={() =>
                      setOptions({ ...options, rhyming: !options.rhyming })
                    }
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-night-600/50 bg-night-800/30 w-full hover:border-night-500 transition-all"
                  >
                    <div
                      className={`toggle-switch ${
                        options.rhyming ? "active" : ""
                      }`}
                    />
                    <span className="font-medium">
                      {options.rhyming ? "Yes, make it rhyme! 🎵" : "Regular prose"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200">
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="magic-btn w-full bg-gradient-to-r from-dream-purple via-dream-pink to-dream-purple bg-[length:200%_100%] hover:bg-right text-white font-bold text-lg py-5 px-8 rounded-2xl transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-dream-purple/30 hover:shadow-dream-purple/50"
              >
                <span className="flex items-center justify-center gap-2">
                  <span>✨</span>
                  Create {pageCount}-Page Picture Book
                  <span>✨</span>
                </span>
              </button>

              {/* Hint */}
              <p className="text-center text-night-400 text-sm">
                Each page will have its own unique illustration
              </p>
            </div>
          </div>
        )}

        {/* Loading Progress */}
        {isLoading && <LoadingProgress loadingState={loadingState} />}

        {/* FlipBook - shown when story exists and loading complete */}
        {story && loadingState.stage === "complete" && (
          <div className="animate-fade-in">
            <FlipBook
              story={story}
              options={options}
              onNewStory={handleNewStory}
              onRetryImage={handleRetryImage}
            />
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 text-night-400 text-sm">
          <p>Made with 💜 for bedtime magic</p>
        </footer>
      </div>
    </main>
  );
}
