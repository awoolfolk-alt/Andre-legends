import { z } from "zod";

export class ContentValidationError extends Error {
  constructor(source: string, details: string) {
    super(`Invalid curriculum content in ${source}:\n${details}`);
    this.name = "ContentValidationError";
  }
}

export function loadContent<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  source: string,
): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new ContentValidationError(source, details);
  }
  return result.data;
}

export function loadContentList<Item extends { id: string }>(
  schema: z.ZodType<Item>,
  input: unknown,
  source: string,
): Item[] {
  const items = loadContent(z.array(schema), input, source);
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) duplicates.add(item.id);
    seen.add(item.id);
  }

  if (duplicates.size) {
    throw new ContentValidationError(
      source,
      `Duplicate id${duplicates.size > 1 ? "s" : ""}: ${[...duplicates].join(", ")}`,
    );
  }

  return items;
}
