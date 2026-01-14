import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "../_lib/rate-limit";
import { isStorySafe } from "../_lib/safety";
import { PAGE_COUNTS } from "@/types/story";

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

function extractResponseText(response: unknown): string | null {
  if (!isRecord(response)) {
    return null;
  }

  const primary = typeof response["output_text"] === "string" ? response["output_text"].trim() : "";
  if (primary) {
    return primary;
  }

  const output = Array.isArray(response["output"]) ? response["output"] : null;
  if (!output) {
    return null;
  }

  const text = output
    .flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }
      const content = Array.isArray(item["content"]) ? item["content"] : [];
      return content;
    })
    .map((part) => {
      if (!isRecord(part)) {
        return "";
      }
      const type = typeof part["type"] === "string" ? part["type"] : "";
      if (type === "output_text" || type === "text") {
        return typeof part["text"] === "string" ? part["text"] : "";
      }
      if (type === "output_json") {
        const json = part["json"];
        if (isRecord(json) || Array.isArray(json)) {
          return JSON.stringify(json);
        }
      }
      if (typeof part["text"] === "string") {
        return part["text"];
      }
      return "";
    })
    .join("")
    .trim();

  return text || null;
}

function describeResponseOutput(response: unknown): string {
  if (!isRecord(response)) {
    return "response is not an object";
  }

  const output = Array.isArray(response["output"]) ? response["output"] : null;
  if (!output) {
    return "output is missing or not an array";
  }

  const summaries = output.map((item) => {
    if (!isRecord(item)) {
      return "unknown:[none]";
    }
    const content = Array.isArray(item["content"]) ? item["content"] : [];
    const contentTypes = content
      .map((part) => {
        if (!isRecord(part)) {
          return "unknown";
        }
        return typeof part["type"] === "string" ? part["type"] : "unknown";
      })
      .join(",");
    const itemType = typeof item["type"] === "string" ? item["type"] : "unknown";
    return `${itemType}:[${contentTypes || "none"}]`;
  });

  return summaries.join(" | ");
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

function getPageCount(length: string): number {
  return PAGE_COUNTS[length as keyof typeof PAGE_COUNTS] || 7;
}

function getWordsPerPage(length: string, pageCount: number): string {
  switch (length) {
    case "short":
      return "30-40 words per page";
    case "medium":
      return "50-70 words per page";
    case "long":
      return "80-100 words per page";
    default:
      return "50-70 words per page";
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
    if (!process.env.OPENAI_API_KEY) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }
    const validation = validateStoryOptions(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const options = validation.options;
    const pageCount = getPageCount(options.length);
    const wordsPerPage = getWordsPerPage(options.length, pageCount);

    const nameInstruction = options.childName
      ? `The main character or a special character should be named "${options.childName}".`
      : "Use a charming, gender-neutral name for the main character.";

    const rhymeInstruction = options.rhyming
      ? "Write the entire story in rhyming verse, like a children's poem. Use AABB or ABAB rhyme schemes."
      : "Write in flowing, rhythmic prose that's pleasant to read aloud.";

    const toneInstruction = options.tone === "soothing"
      ? "Keep the tone calm, peaceful, and sleep-inducing. End with the character feeling safe, cozy, and ready to sleep. Avoid anything startling or overly exciting."
      : "Keep the tone fun and engaging, but still end on a satisfying, peaceful note appropriate for bedtime.";

    const prompt = `You are a beloved children's author creating a bedtime picture book. Write an original story for ${getAgeDescription(options.age)}

STORY REQUIREMENTS:
- Theme: ${getThemeDescription(options.theme)}
- Total pages: ${pageCount} pages
- Each page should have ${wordsPerPage} (2-4 sentences)
- ${nameInstruction}
- ${rhymeInstruction}
- ${toneInstruction}

STRUCTURE REQUIREMENTS:
- Page 1: Introduction - establish setting and main character (describe their appearance in detail for the imagePrompt)
- Pages 2-${pageCount - 2}: Story development with clear, distinct scenes
- Page ${pageCount - 1}: Climax or key moment
- Page ${pageCount}: Peaceful, sleepy conclusion

For EACH page, you must provide:
1. "text": The story text to display (2-4 sentences that will be read aloud)
2. "imagePrompt": A detailed visual description for the illustrator (describe the specific scene, character poses, colors, lighting, mood, setting details - be very specific about what should be shown in the illustration)

IMPORTANT GUIDELINES:
- Create an original, creative story (never reference existing characters or stories)
- Each page should be a distinct scene that can be illustrated separately
- In the FIRST page's imagePrompt, describe the main character's appearance in detail (this establishes consistency)
- Image prompts should describe concrete visual elements, not abstract concepts
- Use vivid but age-appropriate imagery
- Include gentle sensory details (soft sounds, cozy feelings, warm colors)
- End with a peaceful, sleepy conclusion
- Do not include violence, weapons, scary content, or any adult themes

Respond in this exact JSON format:
{
  "title": "The Story Title",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Story text for page 1 that will be read aloud to the child...",
      "imagePrompt": "A cozy bedroom at twilight with soft purple light streaming through gauzy curtains. A small bunny with fluffy white fur, pink inner ears, and bright curious eyes sits on a quilted bed covered in star patterns. The room has warm wooden furniture and glowing fairy lights."
    },
    {
      "pageNumber": 2,
      "text": "Story text for page 2...",
      "imagePrompt": "Detailed visual description for page 2..."
    }
  ]
}`;

    // Use OpenAI Responses API with gpt-4o-mini via fetch for explicit params.
    const responseParams = {
      model: "gpt-4o-mini",
      input: prompt,
      text: {
        format: { type: "json_object" },
      },
      max_output_tokens: 4000,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(responseParams),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI error ${openaiResponse.status}: ${errorText}`);
    }

    const response = (await openaiResponse.json()) as unknown;

    // Extract the text content
    const responseText = extractResponseText(response);
    if (!responseText) {
      const summary = describeResponseOutput(response);
      console.error("Response output summary:", summary);
      throw new Error(`No text content in response (${summary})`);
    }

    let storyData: unknown;
    try {
      storyData = JSON.parse(responseText.trim());
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse story response");
      }
      storyData = JSON.parse(jsonMatch[0]);
    }

    if (!isRecord(storyData)) {
      throw new Error("Invalid story response format");
    }

    const title = typeof storyData.title === "string" ? storyData.title : "";
    const pages = Array.isArray(storyData.pages) ? storyData.pages : null;

    if (!title || !pages) {
      throw new Error("Invalid story response format");
    }

    // Validate each page
    for (const page of pages) {
      if (!page.pageNumber || !page.text || !page.imagePrompt) {
        throw new Error("Invalid page format - missing required fields");
      }

      // Safety check on each page's text
      if (!isStorySafe(page.text)) {
        return NextResponse.json(
          { error: "Generated story did not meet safety requirements." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      title,
      pages: pages.map((page: { pageNumber: number; text: string; imagePrompt: string }) => ({
        pageNumber: page.pageNumber,
        text: page.text,
        imagePrompt: page.imagePrompt,
      })),
    });

  } catch (error) {
    console.error("Story generation error:", error);

    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate story", details },
      { status: 502 }
    );
  }
}
