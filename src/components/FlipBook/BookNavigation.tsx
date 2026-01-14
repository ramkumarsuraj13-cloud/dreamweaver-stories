"use client";

import type { StoryPage } from "@/types/story";

interface BookNavigationProps {
  currentPage: number;
  totalPages: number;
  pages: StoryPage[];
  onNext: () => void;
  onPrev: () => void;
  onGoToPage: (pageNum: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export function BookNavigation({
  currentPage,
  totalPages,
  pages,
  onNext,
  onPrev,
  onGoToPage,
  canGoNext,
  canGoPrev,
}: BookNavigationProps) {
  return (
    <div className="book-navigation">
      {/* Previous button */}
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className="book-nav-button"
        aria-label="Previous page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Page indicator dots */}
      <div className="page-dots">
        {Array.from({ length: totalPages }).map((_, idx) => {
          // Determine if this is a story page with an error
          const isStoryPage = idx > 0 && idx <= pages.length;
          const storyPage = isStoryPage ? pages[idx - 1] : null;
          const hasError = storyPage?.imageStatus === "error";

          return (
            <button
              key={idx}
              onClick={() => onGoToPage(idx)}
              className={`page-dot ${currentPage === idx ? "active" : ""} ${
                hasError ? "has-error" : ""
              }`}
              aria-label={`Go to page ${idx + 1}`}
              aria-current={currentPage === idx ? "page" : undefined}
            />
          );
        })}
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="book-nav-button"
        aria-label="Next page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
