"use client";

import type { LoadingState } from "@/types/story";

interface LoadingProgressProps {
  loadingState: LoadingState;
}

export function LoadingProgress({ loadingState }: LoadingProgressProps) {
  const { stage, storyComplete, imagesComplete, imagesTotal } = loadingState;

  const imageProgress =
    imagesTotal > 0 ? Math.round((imagesComplete / imagesTotal) * 100) : 0;

  return (
    <div className="dream-card bg-night-900/60 backdrop-blur-md rounded-3xl p-8 text-center max-w-md mx-auto">
      <div className="animate-pulse mb-6">
        <span className="text-5xl">✨</span>
      </div>

      <h2 className="font-display text-2xl text-dream-gold mb-6">
        Creating Your Story
      </h2>

      {/* Stage indicators */}
      <div className="space-y-4 mb-6">
        {/* Story generation stage */}
        <div className="flex items-center gap-3">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
              stage === "generating-story"
                ? "bg-dream-purple animate-pulse"
                : storyComplete
                ? "bg-green-500"
                : "bg-night-700"
            }`}
          >
            {storyComplete ? "✓" : stage === "generating-story" ? "..." : "1"}
          </div>
          <span
            className={`text-left flex-1 ${
              stage === "generating-story"
                ? "text-white"
                : storyComplete
                ? "text-night-400"
                : "text-night-500"
            }`}
          >
            Weaving your magical tale
          </span>
        </div>

        {/* Image generation stage */}
        <div className="flex items-center gap-3">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
              stage === "generating-images"
                ? "bg-dream-purple animate-pulse"
                : stage === "complete"
                ? "bg-green-500"
                : "bg-night-700"
            }`}
          >
            {stage === "complete"
              ? "✓"
              : stage === "generating-images"
              ? "..."
              : "2"}
          </div>
          <div className="flex-1 text-left">
            <span
              className={`${
                stage === "generating-images"
                  ? "text-white"
                  : stage === "complete"
                  ? "text-night-400"
                  : "text-night-500"
              }`}
            >
              Painting the illustrations
            </span>
            {stage === "generating-images" && imagesTotal > 0 && (
              <div className="mt-2">
                <div className="h-2 bg-night-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-dream-purple to-dream-pink transition-all duration-300"
                    style={{ width: `${imageProgress}%` }}
                  />
                </div>
                <p className="text-night-400 text-xs mt-1">
                  {imagesComplete} of {imagesTotal} pages
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tip text */}
      <p className="text-night-400 text-sm">
        {stage === "generating-story"
          ? "This usually takes about 10 seconds..."
          : stage === "generating-images"
          ? "Your story is ready! Painting beautiful illustrations..."
          : "Almost there..."}
      </p>
    </div>
  );
}
