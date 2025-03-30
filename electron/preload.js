"use strict";
exports.__esModule = true;
var electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electron", {
    openFile: function () { return electron_1.ipcRenderer.invoke("open-file"); },
    saveFile: function (path, content) { return electron_1.ipcRenderer.invoke("save-file", { path: path, content: content }); }
});
