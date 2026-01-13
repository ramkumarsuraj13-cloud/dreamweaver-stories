const BLOCKLIST = [
  "blood",
  "kill",
  "murder",
  "gun",
  "knife",
  "weapon",
  "suicide",
  "sexual",
  "nude",
  "porn",
  "drug",
  "alcohol",
  "abuse",
];

export function isStorySafe(content: string): boolean {
  const lowered = content.toLowerCase();
  return !BLOCKLIST.some((term) => lowered.includes(term));
}
