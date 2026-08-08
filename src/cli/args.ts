export type CliMode = "dry-run" | "execute";

export type ParsedCliArgs = {
  mode: CliMode;
  notesPath: string | null;
  help: boolean;
};

export class CliArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliArgsError";
  }
}

/**
 * Parse CLI flags.
 * Default mode is dry-run. `--execute` enables writes.
 * `--dry-run` and `--execute` together are rejected.
 */
export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const args = argv.slice(2);
  let dryRunFlag = false;
  let executeFlag = false;
  let notesPath: string | null = null;
  let help = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRunFlag = true;
      continue;
    }
    if (arg === "--execute") {
      executeFlag = true;
      continue;
    }
    if (arg === "--notes") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new CliArgsError("--notes requires a file path");
      }
      notesPath = value;
      i += 1;
      continue;
    }
    throw new CliArgsError(`Unknown argument: ${arg}`);
  }

  if (dryRunFlag && executeFlag) {
    throw new CliArgsError(
      "Cannot combine --dry-run and --execute; omit both for dry-run, or pass --execute alone",
    );
  }

  return {
    mode: executeFlag ? "execute" : "dry-run",
    notesPath,
    help,
  };
}

export function formatCliHelp(appName: string): string {
  return [
    `${appName} — turn meeting notes into tasks via two typed tools`,
    "",
    "Usage:",
    `  npm run notes-to-tasks -- [--dry-run|--execute] [--notes <path>]`,
    "",
    "Flags:",
    "  --dry-run     Print intended API calls only (default)",
    "  --execute     Perform real writes through the adapter",
    "  --notes PATH  Path to meeting notes file",
    "  -h, --help    Show this help",
  ].join("\n");
}
