import { APP_NAME } from "./index.js";

function main(): void {
  // Mode is hardcoded dry-run until flag parsing lands later.
  const mode = "dry-run";
  console.log(`${APP_NAME} mode=${mode}`);
}

main();
