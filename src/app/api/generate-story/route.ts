import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit } from "../_lib/rate-limit";
import { isStorySafe } from "../_lib/safety";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface StoryOptions {
  childName: string;
  age: string;
  length: string;
  theme: string;
  tone: string;
  rhyming: boolean;
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

function validateStoryOptions(body: unknown): { ok: true; options: StoryOptions } | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload." };
  }

  const childNameRaw = typeof body.childName === "string" ? body.childName.trim() : "";
  if (childNameRaw.length > 50) {
    return { ok: false, error: "Child name is too long." };
  }

  const age = typeof body.age === "string" ? body.age : "";
  const length = typeof body.length === "string" ? body.length : "";
  const theme = typeof body.theme === "string" ? body.theme : "";
  const tone = typeof body.tone === "string" ? body.tone : "";
  const rhyming = typeof body.rhyming === "boolean" ? body.rhyming : false;

  const allowedAges = new Set(["baby", "toddler", "preschool", "early-reader"]);
  const allowedLengths = new Set(["short", "medium", "long"]);
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

  if (!allowedAges.has(age)) {
    return { ok: false, error: "Invalid age group." };
  }
  if (!allowedLengths.has(length)) {
    return { ok: false, error: "Invalid story length." };
  }
  if (!allowedThemes.has(theme)) {
    return { ok: false, error: "Invalid theme." };
  }
  if (!allowedTones.has(tone)) {
    return { ok: false, error: "Invalid tone." };
  }

  return {
    ok: true,
    options: {
      childName: childNameRaw,
      age,
      length,
      theme,
      tone,
      rhyming,
    },
  };
}

function getAgeDescription(age: string): string {
  switch (age) {
    case "baby":
      return "a baby (0-1 years old). Use very simple, repetitive language with soft, gentle sounds. Keep sentences extremely short (3-5 words). Focus on sensory experiences and soothing rhythms.";
    case "toddler":
      return "a toddler (2-3 years old). Use simple vocabulary, short sentences, and lots of repetition. Include familiar concepts like animals, colors, and everyday objects.";
    case "preschool":
      return "a preschooler (4-5 years old). Use engaging vocabulary with some new words to learn. Include simple plot with a clear beginning, middle, and end. Add some humor and wonder.";
    case "early-reader":
      return "an early reader (6-8 years old). Use richer vocabulary and more complex sentences. Include character development, challenges to overcome, and meaningful themes.";
    default:
      return "a young child";
  }
}

function getLengthGuide(length: string): string {
  switch (length) {
    case "short":
      return "Keep the story very brief - about 150-200 words (roughly 2 minutes of reading time).";
    case "medium":
      return "Make the story a comfortable length - about 400-500 words (roughly 5 minutes of reading time).";
    case "long":
      return "Create a longer, more developed story - about 800-1000 words (roughly 10 minutes of reading time).";
    default:
      return "about 400-500 words";
  }
}

function getThemeDescription(theme: string): string {
  const themes: Record<string, string> = {
    adventure: "an exciting adventure with exploration and discovery",
    animals: "featuring lovable animal characters in their natural habitats",
    fantasy: "a magical fantasy world with wonder and enchantment",
    space: "an outer space adventure with stars, planets, and cosmic wonder",
    friendship: "a heartwarming story about friendship and kindness",
    silly: "a funny, silly story with humor and unexpected twists",
    nature: "a gentle nature story featuring forests, gardens, or meadows",
    ocean: "an underwater ocean adventure with sea creatures",
  };
  return themes[theme] || "a magical adventure";
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const ip = getClientIp(request);
    const rate = await checkRateLimit(ip, "story");
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
    const validation = validateStoryOptions(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const options = validation.options;
    
    const nameInstruction = options.childName 
      ? `The main character or a special character should be named "${options.childName}".` 
      : "Use a charming, gender-neutral name for the main character.";
    
    const rhymeInstruction = options.rhyming
      ? "Write the entire story in rhyming verse, like a children's poem. Use AABB or ABAB rhyme schemes."
      : "Write in flowing, rhythmic prose that's pleasant to read aloud.";
    
    const toneInstruction = options.tone === "soothing"
      ? "Keep the tone calm, peaceful, and sleep-inducing. End with the character feeling safe, cozy, and ready to sleep. Avoid anything startling or overly exciting."
      : "Keep the tone fun and engaging, but still end on a satisfying, peaceful note appropriate for bedtime.";

    const prompt = `You are a beloved children's author creating a bedtime story. Write an original story for ${getAgeDescription(options.age)}

STORY REQUIREMENTS:
- Theme: ${getThemeDescription(options.theme)}
- ${getLengthGuide(options.length)}
- ${nameInstruction}
- ${rhymeInstruction}
- ${toneInstruction}

IMPORTANT GUIDELINES:
- Create an original, creative story (never reference existing characters or stories)
- Use vivid but age-appropriate imagery
- Include gentle sensory details (soft sounds, cozy feelings, warm colors)
- End with a peaceful, sleepy conclusion
- Make it magical and memorable
- Do not include violence, weapons, scary content, or any adult themes

Respond in this exact JSON format:
{
  "title": "The Story Title",
  "content": "The full story text with paragraph breaks indicated by double newlines"
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the text content
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    // Parse the JSON response
    const responseText = textContent.text;
    
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse story response");
    }
    
    const storyData = JSON.parse(jsonMatch[0]);

    if (!storyData?.title || !storyData?.content) {
      throw new Error("Invalid story response format");
    }

    if (!isStorySafe(storyData.content)) {
      return NextResponse.json(
        { error: "Generated story did not meet safety requirements." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      title: storyData.title,
      content: storyData.content,
    });
    
  } catch (error) {
    console.error("Story generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate story" },
      { status: 502 }
    );
  }
}
