import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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

const AGE_OPTIONS = ["baby", "toddler", "preschool", "early-reader"] as const;
const LENGTH_OPTIONS = ["short", "medium", "long"] as const;
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
const MAX_CHILD_NAME_LENGTH = 50;
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

function parseStoryOptions(payload: unknown): StoryOptions {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }

  const data = payload as Record<string, unknown>;
  const childName = typeof data.childName === "string"
    ? data.childName.trim().slice(0, MAX_CHILD_NAME_LENGTH)
    : "";
  const age = typeof data.age === "string" ? data.age : "";
  const length = typeof data.length === "string" ? data.length : "";
  const theme = typeof data.theme === "string" ? data.theme : "";
  const tone = typeof data.tone === "string" ? data.tone : "";
  const rhyming = data.rhyming;

  if (!AGE_OPTIONS.includes(age as typeof AGE_OPTIONS[number])) {
    throw new Error("Invalid age option");
  }
  if (!LENGTH_OPTIONS.includes(length as typeof LENGTH_OPTIONS[number])) {
    throw new Error("Invalid length option");
  }
  if (!THEME_OPTIONS.includes(theme as typeof THEME_OPTIONS[number])) {
    throw new Error("Invalid theme option");
  }
  if (!TONE_OPTIONS.includes(tone as typeof TONE_OPTIONS[number])) {
    throw new Error("Invalid tone option");
  }
  if (typeof rhyming !== "boolean") {
    throw new Error("Invalid rhyming option");
  }

  return {
    childName,
    age,
    length,
    theme,
    tone,
    rhyming,
  };
}

function extractStoryJson(responseText: string) {
  try {
    return JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse story response");
    }
    return JSON.parse(jsonMatch[0]);
  }
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
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const payload = await request.json();
    const options = parseStoryOptions(payload);
    
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

    const responseText = textContent.text.trim();
    const storyData = extractStoryJson(responseText);

    return NextResponse.json({
      title: storyData.title,
      content: storyData.content,
    });
    
  } catch (error) {
    console.error("Story generation error:", error);
    if (error instanceof Error && error.message.startsWith("Invalid")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to generate story" },
      { status: 500 }
    );
  }
}
