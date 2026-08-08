import { APP_NAME } from "./index.js";
import {
  CliArgsError,
  formatCliHelp,
  parseCliArgs,
} from "./cli/args.js";
import { printRunOutput, runNotesToTasks } from "./cli/run.js";
import { loadEnv } from "./config/env.js";

async function main(): Promise<void> {
  try {
    const parsed = parseCliArgs(process.argv);
    if (parsed.help) {
      console.log(formatCliHelp(APP_NAME));
      return;
    }

    if (!parsed.notesPath) {
      throw new CliArgsError(
        "Missing --notes <path> (try --notes samples/messy-notes.md)",
      );
    }

    const env = loadEnv(process.env);
    console.log(
      `${APP_NAME} mode=${parsed.mode} notes=${parsed.notesPath} model=${env.ollamaModel}`,
    );

    const result = await runNotesToTasks({
      notesPath: parsed.notesPath,
      mode: parsed.mode,
      env,
    });

    printRunOutput(result, parsed.mode);
    result.adapter.close();

    if (result.report.stoppedReason === "model_error") {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${APP_NAME}: ${message}`);
    process.exitCode = 1;
  }
}

void main();
