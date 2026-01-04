"use client";

import { useState } from "react";

interface StoryOptions {
  childName: string;
  age: string;
  length: string;
  theme: string;
  tone: string;
  rhyming: boolean;
}

interface GeneratedStory {
  title: string;
  content: string;
  imageUrl?: string;
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    setStory(null);
    
    try {
      // Generate story
      setLoadingStage("Weaving your magical tale...");
      const storyResponse = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      
      if (!storyResponse.ok) {
        throw new Error("Failed to generate story");
      }
      
      const storyData = await storyResponse.json();
      
      // Generate image
      setLoadingStage("Painting the dreamscape...");
      const imageResponse = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: storyData.title,
          theme: options.theme,
          tone: options.tone,
        }),
      });
      
      let imageUrl = undefined;
      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        imageUrl = imageData.imageUrl;
      }
      
      setStory({
        title: storyData.title,
        content: storyData.content,
        imageUrl,
      });
      
    } catch (err) {
      setError("Something went wrong while creating your story. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingStage("");
    }
  };

  const handleNewStory = () => {
    setStory(null);
    setError("");
  };

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
            Create magical, personalized bedtime tales for your little ones
          </p>
        </header>

        {!story ? (
          /* Story Options Form */
          <div className="dream-card bg-night-900/60 rounded-3xl p-6 md:p-10 border border-night-700/50 animate-slide-up">
            <div className="grid gap-6 md:gap-8">
              
              {/* Child's Name */}
              <div className="space-y-2">
                <label className="block text-dream-gold font-medium text-sm uppercase tracking-wider">
                  Child&apos;s Name <span className="text-night-400 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={options.childName}
                  onChange={(e) => setOptions({ ...options, childName: e.target.value })}
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
                    onChange={(e) => setOptions({ ...options, age: e.target.value })}
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
                    Story Length
                  </label>
                  <select
                    value={options.length}
                    onChange={(e) => setOptions({ ...options, length: e.target.value })}
                    className="dream-select w-full bg-night-800/50 border border-night-600/50 rounded-xl px-5 py-4 text-white transition-all cursor-pointer"
                  >
                    <option value="short">Quick (~2 min)</option>
                    <option value="medium">Medium (~5 min)</option>
                    <option value="long">Long (~10 min)</option>
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
                      onClick={() => setOptions({ ...options, theme: theme.value })}
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
                      { value: "soothing", label: "Soothing 😴", desc: "Calm & peaceful" },
                      { value: "exciting", label: "Exciting ⚡", desc: "Fun & energetic" },
                    ].map((tone) => (
                      <button
                        key={tone.value}
                        onClick={() => setOptions({ ...options, tone: tone.value })}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${
                          options.tone === tone.value
                            ? "border-dream-purple bg-dream-purple/20"
                            : "border-night-600/50 bg-night-800/30 hover:border-night-500"
                        }`}
                      >
                        <span className="block font-medium">{tone.label}</span>
                        <span className="text-xs text-night-300">{tone.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-dream-gold font-medium text-sm uppercase tracking-wider">
                    Make it Rhyme?
                  </label>
                  <button
                    onClick={() => setOptions({ ...options, rhyming: !options.rhyming })}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-night-600/50 bg-night-800/30 w-full hover:border-night-500 transition-all"
                  >
                    <div className={`toggle-switch ${options.rhyming ? "active" : ""}`} />
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
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {loadingStage}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>✨</span>
                    Create Magical Story
                    <span>✨</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Story Display */
          <div className="animate-fade-in">
            {/* Story Header */}
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl md:text-5xl font-bold text-dream-gold mb-4">
                {story.title}
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-transparent via-dream-gold to-transparent mx-auto" />
            </div>

            {/* Story Image */}
            {story.imageUrl && (
              <div className="story-image-container mb-10 max-w-2xl mx-auto">
                <img
                  src={story.imageUrl}
                  alt={story.title}
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            )}

            {/* Story Content */}
            <div className="dream-card bg-night-900/60 rounded-3xl p-6 md:p-12 border border-night-700/50 mb-8">
              <div className="story-text text-night-100 max-w-3xl mx-auto">
                {story.content.split("\n\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* The End */}
            <div className="text-center mb-10">
              <span className="font-display text-2xl text-dream-gold italic">The End</span>
              <div className="mt-2 text-3xl">🌟</div>
            </div>

            {/* New Story Button */}
            <div className="text-center">
              <button
                onClick={handleNewStory}
                className="magic-btn bg-night-800/80 hover:bg-night-700/80 text-white font-semibold py-4 px-8 rounded-xl border border-night-600/50 transition-all"
              >
                ← Create Another Story
              </button>
            </div>
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
