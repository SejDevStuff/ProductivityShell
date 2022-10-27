const { ipcMain, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4 : uuidv4 } = require('uuid');
const { exec } = require('child_process');

const folderMan = require('./folderman');
const appMan = require('./appman');

var progInit = false;

// ============================ //
let SHELL_VERSION = 3;
let SHELL_PATH = null;
// ============================ //

async function init(app) {
    console.log("[IPCManager] Initialising Inter-Process Communications Manager ...");
    folderMan.init();
    appMan.init(folderMan);

    appMan.install("Unknown.png");
    appMan.install("ApplicationStore");

    protocol.registerFileProtocol('atom', (request, callback) => {
        const filePath = folderMan.relpath_to_realpath(request.url.slice('atom://'.length));
        callback(filePath);
    })
    
    progInit = true;
}

function manageIPC(app, win) {
    if (!progInit) {
        console.log("[IPCManager] Please run init() before using any other function!");
        return;
    }

    ipcMain.on('AvailableForUpdates', (e,args) => {
        appMan.checkVersion(SHELL_VERSION).then((result) => {
            if (result) {
                if (SHELL_PATH == null) {
                    win.webContents.send("GetShellPath", "");
                    setTimeout(() => {
                        dialog.showOpenDialog({ properties: ['openFile'], title: "Your shell needs updating. Please select your shell EXE." }).then((path) => {
                            SHELL_PATH = path.filePaths[0];
                            appMan.updateShell(SHELL_PATH).then((result) => {
                                if (result) {
                                    process.exit();
                                } else {
                                    win.webContents.send("Message", "<h1>Error</h1>There was an error whilst trying to update your shell. Restart your computer please.");
                                    return;
                                }
                            });
                        });
                    }, 2000);
                    return;
                }
            }
        });
    });

    ipcMain.on('ShutdownComputer', (e,args) => {
        exec('shutdown /s /t 0');
    });

    ipcMain.on('RestartComputer', (e,args) => {
        exec('shutdown /r /t 0');
    });

    ipcMain.on('GoToMain', (e,args) => {
        win.loadFile('ui/INDEX.HTML');
    });

    ipcMain.on('RunApp', (e, args) => {
        let RealAppPath = folderMan.relpath_to_realpath(args);
        let Mainfile = "INDEX.HTML";

        //console.log("Trying to run app: " + path.join(RealAppPath, Mainfile));

        if (fs.existsSync(path.join(RealAppPath, "Info.json"))) {
            try {
                let JSONData = JSON.parse(fs.readFileSync(path.join(RealAppPath, "Info.json")));
                if ((JSONData["Mainfile"] === undefined) == false) {
                    Mainfile = JSONData["Mainfile"];
                }
            } catch (e) {}
        }

        if (fs.existsSync(path.join(RealAppPath, Mainfile))) {
            let name = RealAppPath;
            let uuid = uuidv4();
            let app_path = path.join(RealAppPath, Mainfile);
            if (fs.existsSync(path.join(RealAppPath, "Info.json"))) {
                try {
                    let JSONData = JSON.parse(fs.readFileSync(path.join(RealAppPath, "Info.json")));
                    if ((JSONData["AppName"] === undefined) == false) {
                        name = JSONData["AppName"];
                    }
                } catch (e) {}
            }
            win.webContents.send('RunApp', {name: name, uuid: uuid, path: app_path});
            //win.loadFile('ui/RUNFILE.HTML');
            return;
        } else {
            win.webContents.send("Message", "<h1>Error</h1>We couldn't run that app! (No Mainfile present)");
            return;
        }
    });

    ipcMain.on('GetApplications', (e, args) => {
        var Applications = [];
        var AvailableApps = folderMan.return_safe_contents("/Applications");
        if (AvailableApps.contents.length != 0) {
            for (let i = 0; i < AvailableApps.contents.length; i++) {
                let App = AvailableApps.contents[i];
                let AppObj = {IconPath: "/Applications/Unknown.png", Name: App.rel_f_path, Path: App.rel_f_path};
                if (App.type == 1) {
                    let RealAppPath = folderMan.relpath_to_realpath(App.rel_f_path);
                    if (fs.existsSync(path.join(RealAppPath, "Icon.png"))) {
                        AppObj.IconPath = folderMan.realpath_to_relpath(path.join(RealAppPath, "Icon.png"));
                    }
                    if (fs.existsSync(path.join(RealAppPath, "Info.json"))) {
                        try {
                            let JSONData = JSON.parse(fs.readFileSync(path.join(RealAppPath, "Info.json")));
                            if ((JSONData["AppName"] === undefined) == false) {
                                AppObj.Name = JSONData["AppName"];
                            }
                        } catch (e) {}
                    }
                    Applications.push(AppObj);
                }
            }
        }
        win.webContents.send('ApplicationsList', Applications);
    });
}

module.exports = {
    init,
    manageIPC
}