"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                  ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
exports.__esModule = true;
var electron_1 = require("electron");
var fs_1 = require("fs");
var isDev = require("electron-is-dev");
var mainWindow = null;

function createWindow() {
  mainWindow = new electron_1.BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + "/preload.js",
    },
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Load the app
  if (isDev) {
    console.log("Loading development URL...");
    mainWindow.loadURL("http://localhost:3000").catch(function (error) {
      console.error("Failed to load development URL:", error);
    });
  } else {
    console.log("Loading production build...");
    mainWindow.loadFile("build/index.html").catch(function (error) {
      console.error("Failed to load production build:", error);
    });
  }

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    }
  );
}

electron_1.app.whenReady().then(createWindow);

electron_1.app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    electron_1.app.quit();
  }
});

electron_1.app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// Open File Dialog
electron_1.ipcMain.handle("open-file", function () {
  return __awaiter(void 0, void 0, void 0, function () {
    var filePaths, content;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [
            4 /*yield*/,
            electron_1.dialog.showOpenDialog({
              properties: ["openFile"],
            }),
          ];
        case 1:
          filePaths = _a.sent();
          if (filePaths.length === 0) return [2 /*return*/, null];
          content = fs_1["default"].readFileSync(filePaths[0], "utf-8");
          return [2 /*return*/, { path: filePaths[0], content: content }];
      }
    });
  });
});

// Save File
electron_1.ipcMain.handle("save-file", function (_, _a) {
  var path = _a.path,
    content = _a.content;
  return __awaiter(void 0, void 0, void 0, function () {
    var filePath;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          if (!!path) return [3 /*break*/, 2];
          return [4 /*yield*/, electron_1.dialog.showSaveDialog({})];
        case 1:
          filePath = _b.sent();
          if (!filePath) return [2 /*return*/, null];
          path = filePath;
          _b.label = 2;
        case 2:
          fs_1["default"].writeFileSync(path, content, "utf-8");
          return [2 /*return*/, path];
      }
    });
  });
});
