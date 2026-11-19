import { Page, SavedComponent } from "./types";
import { getVsCodeApi } from "./vscode";
import { buildPageHTML } from "@/components/builder/frontend/PreviewModal";

export { buildPageHTML };

export function openPreviewInBrowser(
  pages: Page[],
  components: SavedComponent[],
  currentSlug: string = "/",
) {
  const pagesPayload = pages.map((p) => ({
    slug: p.slug,
    html: buildPageHTML(p, pages, components, false, false),
  }));

  const vscode = getVsCodeApi();
  if (vscode) {
    vscode.postMessage({
      type: "openPreviewInBrowser",
      payload: {
        pages: pagesPayload,
        slug: currentSlug,
      },
    });
  } else {
    // Standalone browser fallback
    const targetPage = pages.find((p) => p.slug === currentSlug) || pages[0];
    const html = targetPage
      ? buildPageHTML(targetPage, pages, components, false, false)
      : "";
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
}
