interface VsCodeApi {
  postMessage(message: any): void;
  setState(state: any): void;
  getState(): any;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
    __vscode_api__?: VsCodeApi;
  }
}

export const getVsCodeApi = (): VsCodeApi | null => {
  if (typeof window !== "undefined" && window.acquireVsCodeApi) {
    if (!window.__vscode_api__) {
      window.__vscode_api__ = window.acquireVsCodeApi();
    }
    return window.__vscode_api__;
  }
  return null;
};
