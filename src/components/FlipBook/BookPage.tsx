"use client";

import { PageLoadingState } from "./PageLoadingState";
import type { StoryPage } from "@/types/story";

interface BookPageProps {
  page: StoryPage;
  onRetryImage?: (pageNumber: number) => void;
}

export function BookPage({ page, onRetryImage }: BookPageProps) {
  return (
    <div className="book-page">
      {/* Image section - top half on mobile, left side on desktop */}
      <div className="page-image-container">
        {page.imageStatus === "pending" && <PageLoadingState />}

        {page.imageStatus === "loading" && <PageLoadingState />}

        {page.imageStatus === "loaded" && page.imageUrl && (
          <img
            src={page.imageUrl}
            alt={`Illustration for page ${page.pageNumber}`}
            className="page-image"
          />
        )}

        {page.imageStatus === "error" && (
          <div className="page-image-error">
            <span className="text-5xl mb-3 block">🌙</span>
            <p className="text-night-300 text-sm mb-3">
              Imagine the scene...
            </p>
            {onRetryImage && (
              <button
                onClick={() => onRetryImage(page.pageNumber)}
                className="text-xs text-dream-purple hover:text-dream-pink transition-colors underline"
              >
                Try painting again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Text section */}
      <div className="page-text-container">
        <p className="page-text">{page.text}</p>
        <span className="page-number">{page.pageNumber}</span>
      </div>
    </div>
  );
}
