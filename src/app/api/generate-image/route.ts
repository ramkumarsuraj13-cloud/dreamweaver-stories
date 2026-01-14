import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit } from "../_lib/rate-limit";

type ImageQuality = "low" | "medium" | "high";

interface ImageRequest {
  pageNumber: number;
  imagePrompt: string;
  theme: string;
  tone: string;
  characterDescription?: string;
  quality?: ImageQuality;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateImageRequest(body: unknown): { ok: true; data: ImageRequest } | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload." };
  }

  const pageNumber = typeof body.pageNumber === "number" ? body.pageNumber : 0;
  if (pageNumber < 1 || pageNumber > 15) {
    return { ok: false, error: "Invalid page number." };
  }

  const imagePrompt = typeof body.imagePrompt === "string" ? body.imagePrompt.trim() : "";
  if (!imagePrompt || imagePrompt.length > 1000) {
    return { ok: false, error: "Invalid image prompt." };
  }

  const theme = typeof body.theme === "string" ? body.theme : "";
  const tone = typeof body.tone === "string" ? body.tone : "";
  const characterDescription = typeof body.characterDescription === "string" ? body.characterDescription : undefined;

  // Validate quality parameter (default to "medium" if not provided)
  const allowedQualities = new Set<ImageQuality>(["low", "medium", "high"]);
  let quality: ImageQuality = "medium";
  if (typeof body.quality === "string" && allowedQualities.has(body.quality as ImageQuality)) {
    quality = body.quality as ImageQuality;
  }

  const allowedThemes = new Set([
    "adventure",
    "animals",
    "fantasy",
    "space",
    "friendship",
    "silly",
    "nature",
    "ocean",
  ]);
  const allowedTones = new Set(["soothing", "exciting"]);

  if (!allowedThemes.has(theme)) {
    return { ok: false, error: "Invalid theme." };
  }
  if (!allowedTones.has(tone)) {
    return { ok: false, error: "Invalid tone." };
  }

  return { ok: true, data: { pageNumber, imagePrompt, theme, tone, characterDescription, quality } };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const ip = getClientIp(request);
    const rate = await checkRateLimit(ip, "image");
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        {
          status: 429,
          headers: { "Retry-After": rate.retryAfter.toString() },
        }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }
    const validation = validateImageRequest(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { pageNumber, imagePrompt, tone, characterDescription, quality } = validation.data;

    const moodStyle = tone === "soothing"
      ? "soft, dreamy lighting with gentle pastels and warm colors, peaceful nighttime or twilight atmosphere"
      : "bright, cheerful colors with warm, inviting lighting";

    // Build the prompt using the detailed scene description
    const prompt = `Children's book illustration, page ${pageNumber} of a bedtime picture book.

Scene: ${imagePrompt}

${characterDescription ? `Character reference: ${characterDescription}` : ""}

Art direction: ${moodStyle}. Whimsical watercolor and digital art style, soft rounded shapes, gentle and cozy atmosphere, suitable for young children. No text or words in the image. High quality, professional children's book illustration. Safe for all ages. Consistent art style throughout the book.`;

    // Use OpenAI Images API with gpt-image-1
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt,
      size: "1024x1024",
      quality: quality,
      n: 1,
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    return NextResponse.json({ imageUrl, pageNumber });

  } catch (error) {
    console.error("Image generation error:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate image", imageUrl: null, details },
      { status: 502 }
    );
  }
}
