import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  openFile: () => ipcRenderer.invoke("open-file"),
  saveFile: (path: string, content: string) => ipcRenderer.invoke("save-file", { path, content }),
});
