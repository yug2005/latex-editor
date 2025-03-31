import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import isDev from "electron-is-dev";

// Register protocol handler for production
if (!isDev) {
  // This prevents the ESM protocol error in packaged apps
  app.on("ready", () => {
    const protocol = require("electron").protocol;
    protocol.registerSchemesAsPrivileged([
      { scheme: "electron", privileges: { secure: true, standard: true } },
    ]);
  });
}

// Utility function to log app paths
function logAppPaths() {
  console.log("App paths:");
  console.log("- app.getAppPath():", app.getAppPath());
  console.log("- app.getPath('exe'):", app.getPath("exe"));
  console.log("- app.getPath('userData'):", app.getPath("userData"));
  console.log("- __dirname:", __dirname);

  // Log files in app path
  const appDir = app.getAppPath();
  console.log(`\nFiles in ${appDir}:`);
  try {
    const files = fs.readdirSync(appDir);
    files.forEach((file) => {
      const stats = fs.statSync(path.join(appDir, file));
      console.log(`- ${file} ${stats.isDirectory() ? "(dir)" : "(file)"}`);
    });
  } catch (err) {
    console.error("Error reading app directory:", err);
  }

  // Check if build dir exists
  const buildDir = path.join(appDir, "build");
  if (fs.existsSync(buildDir)) {
    console.log(`\nFiles in ${buildDir}:`);
    try {
      const files = fs.readdirSync(buildDir);
      files.forEach((file) => {
        console.log(`- ${file}`);
      });
    } catch (err) {
      console.error("Error reading build directory:", err);
    }
  } else {
    console.error("Build directory does not exist:", buildDir);
  }
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Log paths for debugging
  if (!isDev) {
    logAppPaths();
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      devTools: true, // Always enable DevTools
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
    try {
      // In production, the index.html is in the build directory
      const indexPath = path.join(app.getAppPath(), "build", "index.html");
      console.log("Trying to load:", indexPath);

      // Check if the file exists
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      } else {
        console.error("Could not find index.html at:", indexPath);
        // Try an alternative path
        const altPath = path.join(__dirname, "..", "..", "build", "index.html");
        console.log("Trying alternative path:", altPath);
        if (fs.existsSync(altPath)) {
          mainWindow.loadFile(altPath);
        } else {
          throw new Error(`Index.html not found at ${indexPath} or ${altPath}`);
        }
      }

      // Open DevTools in production for debugging
      mainWindow.webContents.openDevTools();
    } catch (error) {
      console.error("Failed to load app:", error);
      if (mainWindow) {
        mainWindow.webContents.loadURL(
          `data:text/html,<html><body><h2>Error loading application</h2><pre>${error}</pre></body></html>`
        );
        mainWindow.webContents.openDevTools();
      }
    }
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
  try {
    createWindow();
  } catch (error) {
    console.error("Failed to create window:", error);
  }
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
