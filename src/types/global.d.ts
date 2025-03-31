interface Window {
  electron: {
    openFile: () => Promise<{ path: string; content: string } | null>;
    saveFile: (path: string, content: string) => Promise<string | null>;
  };
}
