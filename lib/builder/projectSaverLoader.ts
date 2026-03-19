import { Page, SavedComponent } from "./types";

export interface DesignTokens {
  colors: Array<{ id: string; name: string; value: string }>;
  typography: Array<{
    id: string;
    name: string;
    value: string;
    category: string;
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
          version: "1.2.0",
          lastUpdated: new Date().toISOString(),
          pageCount: pages.length,
        },
        data: {
          pages,
          savedComponents,
          designTokens: tokens,
          viewSettings: {
            activePageId,
          },
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
      throw new Error("Could not export project.");
    }
  },

  load: (): Promise<LticaProject> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".ltica";

      input.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
          reject("No file selected");
          return;
        }

        try {
          const text = await file.text();
          const parsed = JSON.parse(text) as LticaProject;

          if (!parsed.metadata || !parsed.data || !parsed.data.pages) {
            throw new Error("Invalid .ltica file structure.");
          }

          resolve(parsed);
        } catch (error) {
          reject("Failed to parse file.");
        }
      };

      input.click();
    });
  },
};
