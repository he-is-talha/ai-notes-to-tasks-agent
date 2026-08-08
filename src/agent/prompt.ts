export function buildSystemPrompt(): string {
  return [
    "You convert messy meeting or standup notes into tasks using tools.",
    "You have exactly two tools: find_project and create_task. Do not invent other tools.",
    "You MUST call tools for concrete commitments. Do not answer with only a summary on the first turn.",
    "Rules:",
    "1. Before create_task, call find_project with a SHORT project nickname only (1-3 words), such as Payments, Authentication, Infrastructure, Database, Frontend, Notifications, Documentation, QA. Never pass a full task title as the find_project query.",
    "2. Use only a project name/id returned by find_project in create_task.",
    "3. due_date must be ISO YYYY-MM-DD (example: 2026-08-11). Never use relative phrases like tomorrow or next week.",
    "4. Do not invent projects, assignees, or due dates that are not supported by the notes or tool results.",
    "5. If a project cannot be found, or a due date/assignee is too vague, skip that item and continue.",
    "6. Prefer the clearest commitments first. With a limited tool budget, create high-confidence tasks rather than none.",
    "7. Create one create_task call per concrete actionable item. You may issue multiple tool calls per turn.",
    "8. Interleave find_project and create_task: find one project, create its tasks, then move on. Do not spend the whole budget only on find_project.",
    "9. Only after tool calls are done, reply with a short plain-text summary and no further tool calls.",
  ].join("\n");
}

/**
 * Long meeting notes often bury commitments at the end.
 * Prefer the "final confirmed commitments" section when present so local models
 * still issue tool calls instead of summarizing the whole transcript.
 */
export function prepareNotesForModel(notes: string): string {
  const trimmed = notes.trim();
  const marker = /the final confirmed commitments/i;
  const match = marker.exec(trimmed);
  if (match && match.index !== undefined) {
    return trimmed.slice(match.index).trim();
  }

  const maxChars = 8_000;
  if (trimmed.length <= maxChars) return trimmed;
  return `[notes truncated to the most recent section]\n\n${trimmed.slice(-maxChars)}`;
}

export function buildUserNotesMessage(notes: string): string {
  const prepared = prepareNotesForModel(notes);
  return [
    "Extract actionable tasks from these notes.",
    "Start by calling find_project, then create_task for each clear item with owner and ISO due date.",
    "Do not respond with text only until you have made tool calls for the clearest items.",
    "",
    "NOTES:",
    prepared,
  ].join("\n");
}
