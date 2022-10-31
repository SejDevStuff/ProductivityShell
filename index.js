const { app, BrowserWindow } = require('electron');
const path = require('path');
const ipcmanager = require('./ipcman');
let folderman = require('./folderman');
let appMan = require('./appman');
const log = require('electron-log');
const indexLog = log.scope("MAIN_THREAD");

var mainWindow;

//---//
const SHELL_VERSION = 5;
//---//

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    fullscreen: true
  })
  mainWindow.removeMenu();
  mainWindow.loadFile('ui/INDEX.HTML');
}

function hiccupChecker() {
  if (!folderman.doAllFoldersExist()) {
    indexLog.error("ERR! Missing folders. Invoking a hiccup ...");
    mainWindow.webContents.send("Hiccup");
    folderman.init();
    appMan.init(folderman);
    appMan.install("Unknown.png", SHELL_VERSION).then((res) => {
    appMan.install("ApplicationStore", SHELL_VERSION).then((res) => {
      setTimeout(() => {
          let Applications = appMan.getInstalledApplications();
          mainWindow.webContents.send('ApplicationsList', Applications);
          appMan.returnSafeAppList(SHELL_VERSION).then((applist) => {
            mainWindow.webContents.send("AppList", {data: applist, token: "*"});
          })
          mainWindow.webContents.send("HiccupEnd");
        }, 500)
      });
    });
  }
}

app.whenReady().then(() => {
  ipcmanager.init(app, SHELL_VERSION).then((result) => {
    createWindow();
    try {
      ipcmanager.manageIPC(app, mainWindow);
      setInterval(hiccupChecker, 2000)
    } catch (e) {
      mainWindow.webContents.send("UnclosableModal", "<h1>Fatal Error</h1>We ran into an error which we can't fix. Please force restart your computer.");
    }
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  });
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})