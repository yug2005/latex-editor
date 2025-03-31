"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Use explicit imports to avoid protocol issues
electron_1.contextBridge.exposeInMainWorld("electron", {
    openFile: () => electron_1.ipcRenderer.invoke("open-file"),
    saveFile: (path, content) => electron_1.ipcRenderer.invoke("save-file", { path, content }),
});
