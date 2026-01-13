import { NextRequest, NextResponse } from "next/server";

interface ImageRequest {
  title: string;
  theme: string;
  tone: string;
}

const THEME_OPTIONS = [
  "adventure",
  "animals",
  "fantasy",
  "space",
  "friendship",
  "silly",
  "nature",
  "ocean",
] as const;
const TONE_OPTIONS = ["soothing", "exciting"] as const;
const MAX_TITLE_LENGTH = 120;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

const rateLimitState = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const entry = rateLimitState.get(clientIp);
  if (!entry || now > entry.resetAt) {
    rateLimitState.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  entry.count += 1;
  return false;
}

function parseImageRequest(payload: unknown): ImageRequest {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }

  const data = payload as Record<string, unknown>;
  const title = typeof data.title === "string"
    ? data.title.trim().slice(0, MAX_TITLE_LENGTH)
    : "";
  const theme = typeof data.theme === "string" ? data.theme : "";
  const tone = typeof data.tone === "string" ? data.tone : "";

  if (!title) {
    throw new Error("Invalid title");
  }
  if (!THEME_OPTIONS.includes(theme as typeof THEME_OPTIONS[number])) {
    throw new Error("Invalid theme option");
  }
  if (!TONE_OPTIONS.includes(tone as typeof TONE_OPTIONS[number])) {
    throw new Error("Invalid tone option");
  }

  return { title, theme, tone };
}

function getThemeStyle(theme: string): string {
  const styles: Record<string, string> = {
    adventure: "adventurous scene with paths, hills, or treasure",
    animals: "cute, friendly animals in a natural setting",
    fantasy: "magical fairytale scene with sparkles and enchantment",
    space: "whimsical outer space with friendly stars and planets",
    friendship: "warm scene of characters together, showing friendship",
    silly: "playful, humorous scene with funny expressions",
    nature: "peaceful forest, garden, or meadow scene",
    ocean: "colorful underwater scene with friendly sea creatures",
  };
  return styles[theme] || "magical children's book scene";
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const payload = await request.json();
    const { title, theme, tone } = parseImageRequest(payload);
    
    const moodStyle = tone === "soothing" 
      ? "soft, dreamy lighting with gentle pastels and warm colors, peaceful nighttime or twilight atmosphere"
      : "bright, cheerful colors with warm, inviting lighting";

    const prompt = `Children's book illustration for a bedtime story titled "${title}".

Style: ${getThemeStyle(theme)}. ${moodStyle}.

Art direction: Whimsical watercolor and digital art style, soft rounded shapes, gentle and cozy atmosphere, suitable for young children. No text or words in the image. High quality, professional children's book illustration. Safe for all ages.`;

    const response = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "black-forest-labs/FLUX.1-schnell",
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        n: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Together AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    return NextResponse.json({ imageUrl });
    
  } catch (error) {
    console.error("Image generation error:", error);
    if (error instanceof Error && error.message.startsWith("Invalid")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    // Return success without image - the app will handle missing images gracefully
    return NextResponse.json(
      { error: "Failed to generate image", imageUrl: null },
      { status: 200 }
    );
  }
}
