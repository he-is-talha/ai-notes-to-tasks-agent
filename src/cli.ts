import { APP_NAME } from "./index.js";
import {
  CliArgsError,
  formatCliHelp,
  parseCliArgs,
} from "./cli/args.js";

function main(): void {
  try {
    const parsed = parseCliArgs(process.argv);
    if (parsed.help) {
      console.log(formatCliHelp(APP_NAME));
      return;
    }
    const notes = parsed.notesPath ?? "(none)";
    console.log(`${APP_NAME} mode=${parsed.mode} notes=${notes}`);
  } catch (error) {
    const message = error instanceof CliArgsError ? error.message : String(error);
    console.error(`${APP_NAME}: ${message}`);
    process.exitCode = 1;
  }
}

main();
