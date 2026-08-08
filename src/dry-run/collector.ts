import { formatIntendedCall } from "./format.js";
import type { IntendedApiCall } from "./types.js";

export class IntendedCallCollector {
  #calls: IntendedApiCall[] = [];

  push(call: IntendedApiCall): void {
    this.#calls.push(call);
  }

  snapshot(): IntendedApiCall[] {
    return this.#calls.map((call) => ({
      ...call,
      body: { ...call.body },
    }));
  }

  toJSONL(): string {
    return this.#calls.map((call) => formatIntendedCall(call)).join("\n");
  }

  clear(): void {
    this.#calls = [];
  }
}
