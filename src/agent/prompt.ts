export function buildSystemPrompt(): string {
  return [
    "You convert messy meeting or standup notes into tasks using tools.",
    "You have exactly two tools: find_project and create_task. Do not invent other tools.",
    "Rules:",
    "1. Before create_task, call find_project with a short query and use only a returned project name/id.",
    "2. due_date must be ISO YYYY-MM-DD. Never use relative phrases like tomorrow or next week.",
    "3. Do not invent projects, assignees, or due dates that are not supported by the notes or tool results.",
    "4. If a project cannot be found, or a due date/assignee is too vague, skip that item and continue.",
    "5. Create one create_task call per concrete actionable item.",
    "6. When finished, reply with a short plain-text summary and no further tool calls.",
  ].join("\n");
}

export function buildUserNotesMessage(notes: string): string {
  return [
    "Extract actionable tasks from these notes.",
    "Use find_project then create_task for each clear item.",
    "",
    "NOTES:",
    notes.trim(),
  ].join("\n");
}
