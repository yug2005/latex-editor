"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
// Register protocol handler for production
if (!electron_is_dev_1.default) {
    // This prevents the ESM protocol error in packaged apps
    electron_1.app.on("ready", () => {
        const protocol = require("electron").protocol;
        protocol.registerSchemesAsPrivileged([
            { scheme: "electron", privileges: { secure: true, standard: true } },
        ]);
    });
}
// Utility function to log app paths
function logAppPaths() {
    console.log("App paths:");
    console.log("- app.getAppPath():", electron_1.app.getAppPath());
    console.log("- app.getPath('exe'):", electron_1.app.getPath("exe"));
    console.log("- app.getPath('userData'):", electron_1.app.getPath("userData"));
    console.log("- __dirname:", __dirname);
    // Log files in app path
    const appDir = electron_1.app.getAppPath();
    console.log(`\nFiles in ${appDir}:`);
    try {
        const files = fs_1.default.readdirSync(appDir);
        files.forEach((file) => {
            const stats = fs_1.default.statSync(path_1.default.join(appDir, file));
            console.log(`- ${file} ${stats.isDirectory() ? "(dir)" : "(file)"}`);
        });
    }
    catch (err) {
        console.error("Error reading app directory:", err);
    }
    // Check if build dir exists
    const buildDir = path_1.default.join(appDir, "build");
    if (fs_1.default.existsSync(buildDir)) {
        console.log(`\nFiles in ${buildDir}:`);
        try {
            const files = fs_1.default.readdirSync(buildDir);
            files.forEach((file) => {
                console.log(`- ${file}`);
            });
        }
        catch (err) {
            console.error("Error reading build directory:", err);
        }
    }
    else {
        console.error("Build directory does not exist:", buildDir);
    }
}
let mainWindow = null;
function createWindow() {
    // Log paths for debugging
    if (!electron_is_dev_1.default) {
        logAppPaths();
    }
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, "preload.js"),
            devTools: true, // Always enable DevTools
        },
    });
    // Load the app
    if (electron_is_dev_1.default) {
        console.log("Loading development URL...");
        mainWindow.loadURL("http://localhost:3000");
        // Open the DevTools.
        mainWindow.webContents.openDevTools();
    }
    else {
        console.log("Loading production build...");
        try {
            // In production, the index.html is in the build directory
            const indexPath = path_1.default.join(electron_1.app.getAppPath(), "build", "index.html");
            console.log("Trying to load:", indexPath);
            // Check if the file exists
            if (fs_1.default.existsSync(indexPath)) {
                mainWindow.loadFile(indexPath);
            }
            else {
                console.error("Could not find index.html at:", indexPath);
                // Try an alternative path
                const altPath = path_1.default.join(__dirname, "..", "..", "build", "index.html");
                console.log("Trying alternative path:", altPath);
                if (fs_1.default.existsSync(altPath)) {
                    mainWindow.loadFile(altPath);
                }
                else {
                    throw new Error(`Index.html not found at ${indexPath} or ${altPath}`);
                }
            }
            // Open DevTools in production for debugging
            mainWindow.webContents.openDevTools();
        }
        catch (error) {
            console.error("Failed to load app:", error);
            if (mainWindow) {
                mainWindow.webContents.loadURL(`data:text/html,<html><body><h2>Error loading application</h2><pre>${error}</pre></body></html>`);
                mainWindow.webContents.openDevTools();
            }
        }
    }
    // Debug events
    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
        console.error("Failed to load:", errorCode, errorDescription);
    });
    mainWindow.webContents.on("did-finish-load", () => {
        console.log("Window loaded successfully");
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
// This method will be called when Electron has finished initialization
electron_1.app.whenReady().then(() => {
    console.log("Electron app is ready");
    try {
        createWindow();
    }
    catch (error) {
        console.error("Failed to create window:", error);
    }
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
// Open File Dialog
electron_1.ipcMain.handle("open-file", () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield electron_1.dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "LaTeX Files", extensions: ["tex"] }],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        const content = fs_1.default.readFileSync(result.filePaths[0], "utf-8");
        return { path: result.filePaths[0], content };
    }
    return null;
}));
// Save File
electron_1.ipcMain.handle("save-file", (_, { path: filePath, content }) => __awaiter(void 0, void 0, void 0, function* () {
    if (!filePath) {
        const result = yield electron_1.dialog.showSaveDialog({
            filters: [{ name: "LaTeX Files", extensions: ["tex"] }],
        });
        if (!result.canceled && result.filePath) {
            filePath = result.filePath;
        }
        else {
            return null;
        }
    }
    fs_1.default.writeFileSync(filePath, content, "utf-8");
    return filePath;
}));
