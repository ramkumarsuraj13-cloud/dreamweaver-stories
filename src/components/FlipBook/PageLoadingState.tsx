"use client";

export function PageLoadingState() {
  return (
    <div className="page-image-skeleton">
      <div className="skeleton-content">
        <span className="skeleton-icon">🎨</span>
        <p className="skeleton-text">Painting...</p>
      </div>
    </div>
  );
}
