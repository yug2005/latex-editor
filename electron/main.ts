import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import isDev from "electron-is-dev";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the app
  if (isDev) {
    console.log("Loading development URL...");
    mainWindow.loadURL("http://localhost:3000");
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    console.log("Loading production build...");
    mainWindow.loadFile(path.join(__dirname, "../build/index.html"));
  }

  // Debug events
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    }
  );

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Window loaded successfully");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log("Electron app is ready");
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Open File Dialog
ipcMain.handle("open-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "LaTeX Files", extensions: ["tex"] }],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], "utf-8");
    return { path: result.filePaths[0], content };
  }
  return null;
});

// Save File
ipcMain.handle("save-file", async (_, { path: filePath, content }) => {
  if (!filePath) {
    const result = await dialog.showSaveDialog({
      filters: [{ name: "LaTeX Files", extensions: ["tex"] }],
    });

    if (!result.canceled && result.filePath) {
      filePath = result.filePath;
    } else {
      return null;
    }
  }

  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
});
