/** Seeded project names for the offline SQLite demo. */
export const DEMO_PROJECT_NAMES = [
  "Backend Platform",
  "Infrastructure",
  "Payments",
  "Authentication",
  "API & Documentation",
  "Database",
  "DevOps & CI",
  "Kubernetes Platform",
  "QA & Testing",
  "Frontend",
  "Customer Notifications",
  "Search",
  "Security",
  "Product Engineering",
] as const;

export type DemoProjectName = (typeof DEMO_PROJECT_NAMES)[number];

export type ProjectRow = {
  id: string;
  name: string;
};

/**
 * Insert demo projects if the table is empty.
 * Accepts any object that can insert a project row (SQLite adapter hook).
 */
export function seedDemoProjects(insertProject: (name: string) => ProjectRow): ProjectRow[] {
  return DEMO_PROJECT_NAMES.map((name) => insertProject(name));
}
