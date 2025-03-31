// Use CommonJS require for Electron
const path = require("path");
const { app, BrowserWindow, protocol } = require("electron");
const fs = require("fs");
const url = require("url");

// Create a global error handler
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  console.error(error.stack);
});

// Log application startup
console.log("Starting application");
console.log("App path:", app.getAppPath());
console.log("Directory:", __dirname);

// Register the electron protocol - MUST BE BEFORE app.whenReady()
protocol.registerSchemesAsPrivileged([
  { scheme: "electron", privileges: { standard: true, secure: true } },
  {
    scheme: "app",
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Register app:// protocol to serve local files
  protocol.registerFileProtocol("app", (request, callback) => {
    const filePath = url.fileURLToPath(
      "file://" +
        path.join(app.getAppPath(), "build", request.url.slice("app://".length))
    );
    console.log(
      "Loading file from app:// protocol:",
      request.url,
      "at path:",
      filePath
    );
    callback(filePath);
  });

  // Find preload.js file
  let preloadPath = null;
  const possiblePreloadPaths = [
    path.join(__dirname, "electron", "dist", "preload.js"),
    path.join(app.getAppPath(), "electron", "dist", "preload.js"),
    path.join(__dirname, "..", "electron", "dist", "preload.js"),
  ];

  for (const testPath of possiblePreloadPaths) {
    console.log("Checking preload path:", testPath);
    if (fs.existsSync(testPath)) {
      console.log("Found preload.js at:", testPath);
      preloadPath = testPath;
      break;
    }
  }

  if (!preloadPath) {
    console.warn("Could not find preload.js, proceeding without it");
    preloadPath = path.join(__dirname, "dummy-preload.js");
    // Create a dummy preload file
    fs.writeFileSync(
      preloadPath,
      "console.log('Using dummy preload');",
      "utf8"
    );
  }

  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      devTools: true,
      webSecurity: false, // Disable web security for local file loading
    },
  });

  // Load the app
  const isDev =
    process.env.NODE_ENV === "development" ||
    !app.isPackaged ||
    process.argv.indexOf("--dev") !== -1;

  if (isDev) {
    console.log("Loading development URL...");
    mainWindow.loadURL("http://localhost:3000");
  } else {
    console.log("Loading production build...");
    try {
      // Try different possible paths for the index.html file
      const possiblePaths = [
        path.join(__dirname, "index.html"),
        path.join(app.getAppPath(), "build", "index.html"),
        path.join(app.getAppPath(), "index.html"),
      ];

      let indexPath = null;

      for (const testPath of possiblePaths) {
        console.log("Checking path:", testPath);
        if (fs.existsSync(testPath)) {
          console.log("Found index.html at:", testPath);
          indexPath = testPath;
          break;
        }
      }

      if (indexPath) {
        console.log("Loading from:", indexPath);

        // Modify index.html to use app:// protocol
        const indexHtml = fs.readFileSync(indexPath, "utf8");
        const modifiedHtml = indexHtml
          // Convert absolute paths to app:// protocol
          .replace(/href="\//g, 'href="app://')
          .replace(/src="\//g, 'src="app://')
          // Also handle relative paths in case they're used
          .replace(/href="static\//g, 'href="app://static/')
          .replace(/src="static\//g, 'src="app://static/')
          // Update base URL if needed
          .replace(/<base href=".*?"/, `<base href="app://"`);

        // Write the modified index.html to a temporary file
        const tempIndexPath = path.join(
          app.getPath("temp"),
          "modified-index.html"
        );
        fs.writeFileSync(tempIndexPath, modifiedHtml);
        console.log("Created modified index.html at:", tempIndexPath);

        // Load the modified index.html
        mainWindow.loadFile(tempIndexPath);
      } else {
        throw new Error("Could not find index.html");
      }
    } catch (error) {
      console.error("Failed to load app:", error);
      mainWindow.loadURL(
        `data:text/html,<html><body><h2>Error loading application</h2><pre>${error}</pre></body></html>`
      );
    }
  }

  // Open DevTools in all cases for debugging
  mainWindow.webContents.openDevTools();

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
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle IPC directly here to avoid requiring main.js
const { ipcMain, dialog } = require("electron");

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
