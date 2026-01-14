"use client";

interface EndPageProps {
  onNewStory: () => void;
}

export function EndPage({ onNewStory }: EndPageProps) {
  return (
    <div className="book-page end-page">
      <div className="end-page-content">
        <div className="end-decoration">
          <span className="text-6xl">🌙</span>
        </div>

        <h2 className="end-title">The End</h2>

        <p className="end-message">
          Sweet dreams, little one...
        </p>

        <div className="end-stars">
          <span>⭐</span>
          <span>✨</span>
          <span>⭐</span>
        </div>

        <button
          onClick={onNewStory}
          className="new-story-button"
        >
          <span className="mr-2">📖</span>
          Create Another Story
        </button>
      </div>
    </div>
  );
}
