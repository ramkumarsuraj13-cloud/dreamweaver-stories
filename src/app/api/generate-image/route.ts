import { NextRequest, NextResponse } from "next/server";

interface ImageRequest {
  title: string;
  theme: string;
  tone: string;
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
    const { title, theme, tone }: ImageRequest = await request.json();
    
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
    // Return success without image - the app will handle missing images gracefully
    return NextResponse.json(
      { error: "Failed to generate image", imageUrl: null },
      { status: 200 }
    );
  }
}
