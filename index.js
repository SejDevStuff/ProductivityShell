const { app, BrowserWindow } = require('electron');
const path = require('path');
const ipcmanager = require('./ipcman');

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

app.whenReady().then(() => {
  ipcmanager.init(app).then((result) => {
    createWindow();
    ipcmanager.manageIPC(app, mainWindow);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  });
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})