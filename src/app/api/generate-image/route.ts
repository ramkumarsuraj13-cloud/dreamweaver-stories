import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "../_lib/rate-limit";

interface ImageRequest {
  title: string;
  theme: string;
  tone: string;
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

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 120) {
    return { ok: false, error: "Invalid title." };
  }

  const theme = typeof body.theme === "string" ? body.theme : "";
  const tone = typeof body.tone === "string" ? body.tone : "";
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

  return { ok: true, data: { title, theme, tone } };
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
    if (!process.env.TOGETHER_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

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

    const body = await request.json();
    const validation = validateImageRequest(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, theme, tone } = validation.data;
    
    const moodStyle = tone === "soothing" 
      ? "soft, dreamy lighting with gentle pastels and warm colors, peaceful nighttime or twilight atmosphere"
      : "bright, cheerful colors with warm, inviting lighting";

    const prompt = `Children's book illustration for a bedtime story titled "${title}".

Style: ${getThemeStyle(theme)}. ${moodStyle}.

Art direction: Whimsical watercolor and digital art style, soft rounded shapes, gentle and cozy atmosphere, suitable for young children. No text or words in the image. High quality, professional children's book illustration. Safe for all ages.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

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
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

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
    return NextResponse.json(
      { error: "Failed to generate image", imageUrl: null },
      { status: 502 }
    );
  }
}
