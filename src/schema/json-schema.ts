import { z } from "zod";
import type { ZodType } from "zod";

export type OllamaToolParameters = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
};

/**
 * Convert a Zod object schema into a plain JSON Schema parameters object
 * suitable for Ollama's `tools[].function.parameters` field.
 */
export function zodToParameters(schema: ZodType): OllamaToolParameters {
  const raw = z.toJSONSchema(schema) as Record<string, unknown>;
  const { $schema: _schema, ...rest } = raw;

  if (rest.type !== "object" || typeof rest.properties !== "object" || rest.properties === null) {
    throw new Error("Tool parameter schemas must be Zod objects");
  }

  return rest as OllamaToolParameters;
}
