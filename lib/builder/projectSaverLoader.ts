import { Page, SavedComponent } from "./types";

export interface DesignTokens {
  colors: Array<{ id: string; name: string; value: string }>;
  typography: Array<{
    id: string;
    name: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
  }>;
}

export interface LticaProject {
  metadata: {
    name: string;
    version: string;
    lastUpdated: string;
    pageCount: number;
  };
  data: {
    pages: Page[];
    savedComponents: SavedComponent[];
    designTokens: DesignTokens;
    viewSettings: {
      activePageId: string;
    };
  };
}

const CURRENT_VERSION = "1.3.0";

function migrateProject(project: LticaProject): LticaProject {
  const v = project.metadata.version ?? "1.0.0";
  if (!Array.isArray(project.data.savedComponents)) {
    project.data.savedComponents = [];
  }

  // 1.1.0 → 1.2.0: designTokens didn't exist
  if (!project.data.designTokens) {
    project.data.designTokens = { colors: [], typography: [] };
  } else {
    if (!Array.isArray(project.data.designTokens.colors))
      project.data.designTokens.colors = [];
    if (!Array.isArray(project.data.designTokens.typography))
      project.data.designTokens.typography = [];
  }

  if (!project.data.viewSettings) {
    project.data.viewSettings = {
      activePageId: project.data.pages[0]?.id ?? "",
    };
  }

  // Always stamp the current version so re-saved files are up to date
  project.metadata.version = CURRENT_VERSION;

  return project;
}

// ─── Saver / Loader ───────────────────────────────────────────────────────────

export const ProjectSaverLoader = {
  save: (
    name: string,
    pages: Page[],
    savedComponents: SavedComponent[],
    tokens: DesignTokens,
    activePageId: string,
  ): void => {
    try {
      const project: LticaProject = {
        metadata: {
          name: name || "untitled-project",
          version: CURRENT_VERSION,
          lastUpdated: new Date().toISOString(),
          pageCount: pages.length,
        },
        data: {
          pages,
          savedComponents,
          designTokens: tokens,
          viewSettings: { activePageId },
        },
      };

      const jsonString = JSON.stringify(project, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const safeName = (name || "project")
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, "-");
      link.href = url;
      link.download = `${safeName}.ltica`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(
        `Could not export project: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  load: (): Promise<LticaProject> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".ltica,.json";

      // Handle cancel — supported in modern browsers; prevents the Promise hanging forever
      input.addEventListener("cancel", () => reject("cancelled"));

      // Fallback cancel detection for browsers that don't fire "cancel":
      // listen for the window regaining focus after the picker closes with no file
      let focusFired = false;
      const onWindowFocus = () => {
        focusFired = true;
        // Give the input's onchange a tick to fire first
        setTimeout(() => {
          if (!input.files?.length) reject("cancelled");
        }, 300);
        window.removeEventListener("focus", onWindowFocus);
      };
      window.addEventListener("focus", onWindowFocus);

      input.onchange = async (event: Event) => {
        window.removeEventListener("focus", onWindowFocus);

        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject("No file selected");
          return;
        }

        // Guard against absurdly large files
        if (file.size > 50 * 1024 * 1024) {
          reject("File too large (max 50 MB)");
          return;
        }

        try {
          const text = await file.text();
          const parsed = JSON.parse(text) as LticaProject;

          // Basic structure validation
          if (
            !parsed.metadata ||
            !parsed.data ||
            !Array.isArray(parsed.data.pages)
          ) {
            throw new Error(
              "Invalid .ltica file structure — missing required fields.",
            );
          }

          // Migrate and backfill optional fields from older versions
          resolve(migrateProject(parsed));
        } catch (error) {
          reject(
            `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      };

      input.click();
    });
  },
};
