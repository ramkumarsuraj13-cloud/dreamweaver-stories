"use client";

import { useState, useCallback } from "react";
import type {
  StoryOptions,
  GeneratedStory,
  StoryPage,
  StoryApiResponse,
  LoadingState,
} from "@/types/story";

const CONCURRENCY = 3; // Generate 3 images at a time

export function useStoryGeneration() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: "idle",
    storyComplete: false,
    imagesComplete: 0,
    imagesTotal: 0,
  });
  const [error, setError] = useState<string>("");

  const generate = useCallback(
    async (options: StoryOptions): Promise<GeneratedStory | null> => {
      setError("");
      setLoadingState({
        stage: "generating-story",
        storyComplete: false,
        imagesComplete: 0,
        imagesTotal: 0,
      });

      try {
        // Step 1: Generate story text
        const storyResponse = await fetch("/api/generate-story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options),
        });

        if (!storyResponse.ok) {
          const errorData = await storyResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate story");
        }

        const storyData: StoryApiResponse = await storyResponse.json();

        // Initialize story with pending images
        const story: GeneratedStory = {
          title: storyData.title,
          pages: storyData.pages.map((p) => ({
            ...p,
            imageStatus: "pending" as const,
          })),
        };

        setLoadingState((prev) => ({
          ...prev,
          stage: "generating-images",
          storyComplete: true,
          imagesTotal: story.pages.length,
        }));

        // Extract character description from first page for consistency
        const characterDescription = story.pages[0]?.imagePrompt;

        // Step 2: Generate images with controlled concurrency
        for (let i = 0; i < story.pages.length; i += CONCURRENCY) {
          const batch = story.pages.slice(i, i + CONCURRENCY);

          const imagePromises = batch.map(async (page, batchIdx) => {
            const pageIdx = i + batchIdx;
            story.pages[pageIdx].imageStatus = "loading";

            try {
              const imageResponse = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  pageNumber: page.pageNumber,
                  imagePrompt: page.imagePrompt,
                  theme: options.theme,
                  tone: options.tone,
                  characterDescription:
                    pageIdx > 0 ? characterDescription : undefined,
                }),
              });

              if (imageResponse.ok) {
                const { imageUrl } = await imageResponse.json();
                story.pages[pageIdx].imageUrl = imageUrl;
                story.pages[pageIdx].imageStatus = "loaded";
              } else {
                story.pages[pageIdx].imageStatus = "error";
              }
            } catch {
              story.pages[pageIdx].imageStatus = "error";
            }

            setLoadingState((prev) => ({
              ...prev,
              imagesComplete: prev.imagesComplete + 1,
            }));
          });

          await Promise.all(imagePromises);
        }

        // Use first successfully loaded image as cover
        const firstLoadedPage = story.pages.find(
          (p) => p.imageStatus === "loaded"
        );
        story.coverImageUrl = firstLoadedPage?.imageUrl;

        setLoadingState((prev) => ({ ...prev, stage: "complete" }));
        return story;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        setLoadingState({
          stage: "idle",
          storyComplete: false,
          imagesComplete: 0,
          imagesTotal: 0,
        });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setLoadingState({
      stage: "idle",
      storyComplete: false,
      imagesComplete: 0,
      imagesTotal: 0,
    });
    setError("");
  }, []);

  // Function to retry a single failed image
  const retryImage = useCallback(
    async (
      story: GeneratedStory,
      pageNumber: number,
      options: StoryOptions
    ): Promise<StoryPage | null> => {
      const pageIdx = story.pages.findIndex((p) => p.pageNumber === pageNumber);
      if (pageIdx === -1) return null;

      const page = story.pages[pageIdx];
      page.imageStatus = "loading";

      try {
        const imageResponse = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageNumber: page.pageNumber,
            imagePrompt: page.imagePrompt,
            theme: options.theme,
            tone: options.tone,
            characterDescription:
              pageIdx > 0 ? story.pages[0]?.imagePrompt : undefined,
          }),
        });

        if (imageResponse.ok) {
          const { imageUrl } = await imageResponse.json();
          page.imageUrl = imageUrl;
          page.imageStatus = "loaded";
          return page;
        } else {
          page.imageStatus = "error";
          return null;
        }
      } catch {
        page.imageStatus = "error";
        return null;
      }
    },
    []
  );

  return { generate, loadingState, error, reset, retryImage };
}
