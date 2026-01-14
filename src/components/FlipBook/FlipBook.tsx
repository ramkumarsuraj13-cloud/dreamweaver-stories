"use client";

import { useState, useCallback } from "react";
import { BookPage } from "./BookPage";
import { BookNavigation } from "./BookNavigation";
import { BookCover } from "./BookCover";
import { EndPage } from "./EndPage";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import type { GeneratedStory, StoryOptions } from "@/types/story";

interface FlipBookProps {
  story: GeneratedStory;
  options: StoryOptions;
  onNewStory: () => void;
  onRetryImage?: (pageNumber: number) => void;
}

export function FlipBook({
  story,
  onNewStory,
  onRetryImage,
}: FlipBookProps) {
  // Page 0 = cover, pages 1-N = story pages, page N+1 = "The End"
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<
    "left" | "right" | null
  >(null);

  const totalPages = story.pages.length + 2; // Cover + story pages + end page

  const goToPage = useCallback(
    (pageNum: number, direction: "left" | "right") => {
      if (isAnimating || pageNum < 0 || pageNum >= totalPages) return;

      setIsAnimating(true);
      setAnimationDirection(direction);

      // Trigger animation, then update page
      setTimeout(() => {
        setCurrentPage(pageNum);
        setIsAnimating(false);
        setAnimationDirection(null);
      }, 300); // Match CSS transition duration
    },
    [isAnimating, totalPages]
  );

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1, "left");
    }
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      goToPage(currentPage - 1, "right");
    }
  }, [currentPage, goToPage]);

  // Swipe gesture support
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: nextPage,
    onSwipeRight: prevPage,
  });

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: nextPage,
    onPrev: prevPage,
    enabled: true,
  });

  // Get current story page (1-indexed from story.pages)
  const currentStoryPage =
    currentPage > 0 && currentPage <= story.pages.length
      ? story.pages[currentPage - 1]
      : null;

  return (
    <div
      className="flip-book-container"
      {...swipeHandlers}
    >
      <div
        className={`book-page-wrapper ${
          animationDirection ? `flip-${animationDirection}` : ""
        }`}
      >
        {currentPage === 0 && (
          <BookCover title={story.title} coverImage={story.coverImageUrl} />
        )}

        {currentStoryPage && (
          <BookPage
            page={currentStoryPage}
            onRetryImage={onRetryImage}
          />
        )}

        {currentPage === totalPages - 1 && <EndPage onNewStory={onNewStory} />}
      </div>

      <BookNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        pages={story.pages}
        onNext={nextPage}
        onPrev={prevPage}
        onGoToPage={(pageNum) =>
          goToPage(pageNum, pageNum > currentPage ? "left" : "right")
        }
        canGoNext={currentPage < totalPages - 1}
        canGoPrev={currentPage > 0}
      />
    </div>
  );
}
