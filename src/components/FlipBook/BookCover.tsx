"use client";

import { PageLoadingState } from "./PageLoadingState";

interface BookCoverProps {
  title: string;
  coverImage?: string;
}

export function BookCover({ title, coverImage }: BookCoverProps) {
  return (
    <div className="book-page book-cover">
      {/* Cover image */}
      <div className="page-image-container">
        {coverImage ? (
          <img
            src={coverImage}
            alt="Story cover illustration"
            className="page-image"
          />
        ) : (
          <PageLoadingState />
        )}
      </div>

      {/* Title section */}
      <div className="cover-title-container">
        <div className="cover-decoration">✨</div>
        <h1 className="cover-title">{title}</h1>
        <div className="cover-decoration">✨</div>
        <p className="cover-subtitle">A Bedtime Story</p>
        <p className="cover-hint">
          Tap or swipe to turn pages
        </p>
      </div>
    </div>
  );
}
