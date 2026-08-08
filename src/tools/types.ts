import type { OllamaToolParameters } from "../schema/json-schema.js";

export type OllamaToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: OllamaToolParameters;
  };
};
