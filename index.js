const { app, BrowserWindow } = require('electron');
const path = require('path');
const ipcmanager = require('./ipcman');
let folderman = require('./folderman');
const log = require('electron-log');
const indexLog = log.scope("MAIN_THREAD");

var mainWindow;

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
    mainWindow.webContents.send("HiccupEnd");
  }
}

app.whenReady().then(() => {
  ipcmanager.init(app).then((result) => {
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