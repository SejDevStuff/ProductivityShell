const { ipcMain, protocol, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4 : uuidv4 } = require('uuid');
const { exec } = require('child_process');
const log = require('electron-log');
const ipcManLog = log.scope("IPCManager");

const folderMan = require('./folderman');
const appMan = require('./appman');

var progInit = false;

// ============================ //
let SHELL_VERSION = 5;
let SHELL_PATH = null;
// ============================ //

async function init(app, shellver) {
    ipcManLog.info("Initialising Inter-Process Communications Manager ...");
    folderMan.init();
    appMan.init(folderMan);
    SHELL_VERSION = shellver;
    protocol.registerFileProtocol('atom', (request, callback) => {
        const filePath = folderMan.relpath_to_realpath(request.url.slice('atom://'.length));
        callback(filePath);
    })
    progInit = true;
}

function nullOrUndefined(path) {
    if (path === undefined || path === null) {
        return true;
    } else {
        return false;
    }
}

function manageIPC(app, win) {
    if (!progInit) {
        ipcManLog.error("Please run init() before using any other function!");
        return;
    }

    appMan.install("Unknown.png", SHELL_VERSION).then((res) => {
        appMan.install("ApplicationStore", SHELL_VERSION).then((res) => {
            setTimeout(() => {
                let Applications = appMan.getInstalledApplications();
                win.webContents.send('ApplicationsList', Applications);
                appMan.returnSafeAppList(SHELL_VERSION).then((applist) => {
                    win.webContents.send("AppList", {data: applist, token: "*"});
                })
            }, 500)
        });
    });

    ipcMain.on('GetOnlineAppList', (e, args) => {
        ipcManLog.info("GetOnlineAppList request");
        let token = args;
        if (nullOrUndefined(token)) {
            return;
        }
        appMan.returnSafeAppList(SHELL_VERSION).then((applist) => {
            win.webContents.send("AppList", {data: applist, token: token});
        })
    });

    ipcMain.on('ReadFile', (e, args) => {
        ipcManLog.info("ReadFile request");
        let path = args.path;
        let token = args.token;
        if (nullOrUndefined(path) || nullOrUndefined(token)) {
            return;
        }
        win.webContents.send("FileContents", {data: folderMan.read_file_relpath(path), token: token});
    });

    ipcMain.on('CopyFile', (e, args) => {
        ipcManLog.info("CopyFile request");
        let src = args.src;
        let dest = args.dest;
        let token = args.token;
        if (nullOrUndefined(src) || nullOrUndefined(dest) || nullOrUndefined(token)) {
            return;
        }
        let op = folderMan.copy_file_relpath(src, dest);
        win.webContents.send("DirContents", {data: folderMan.return_safe_contents(path.basename(path.dirname(dest))), token: token});
        if (!op) {
            win.webContents.send("Message", "<h1>File Operation Error</h1>We couldn't copy that file.");
        }
    });

    ipcMain.on('MoveFile', (e, args) => {
        ipcManLog.info("MoveFile request");
        let src = args.src;
        let dest = args.dest;
        let token = args.token;
        if (nullOrUndefined(src) || nullOrUndefined(dest) || nullOrUndefined(token)) {
            return;
        }
        let op = folderMan.mv_file_relpath(src, dest);
        win.webContents.send("DirContents", {data: folderMan.return_safe_contents(path.basename(path.dirname(dest))), token: token});
        if (!op) {
            win.webContents.send("Message", "<h1>File Operation Error</h1>We couldn't move that file.");
        }
    });

    ipcMain.on('WriteFile', (e, args) => {
        ipcManLog.info("WriteFile request");
        if (nullOrUndefined(args.path) || nullOrUndefined(args.data) || nullOrUndefined(args.token)) {
            return;
        }
        let op = folderMan.write_file_relpath(args.path, args.data);
        win.webContents.send("DirContents", {data: folderMan.return_safe_contents(path.basename(path.dirname(args.path))), token: args.token});
        if (!op) {
            win.webContents.send("Message", "<h1>File Operation Error</h1>We couldn't write to that file.");
        }
    });

    ipcMain.on('ReadDirectory', (e, args) => {
        let path = args.path;
        let token = args.token;
        if (nullOrUndefined(path) || nullOrUndefined(token)) return;
        let dirC = folderMan.return_safe_contents(path);
        win.webContents.send("DirContents", {data: dirC, token: token});
    });

    ipcMain.on("MakeDirectory", (e, args) => {
        ipcManLog.info("MakeDirectory request");
        let _path = args.path;
        let token = args.token;
        if (nullOrUndefined(_path) || nullOrUndefined(token)) return;
        let op = folderMan.make_dir_relpath(_path);
        let dirC = folderMan.return_safe_contents(path.basename(path.dirname(_path)));
        win.webContents.send("DirContents", {data: dirC, token: token});
        if (!op) {
            win.webContents.send("Message", "<h1>File Operation Error</h1>We couldn't make that directory.");
        }
    });

    ipcMain.on("Remove", (e, args) => {
        ipcManLog.info("Remove request");
        let _path = args.path;
        let token = args.token;
        if (nullOrUndefined(_path) || nullOrUndefined(token)) return;
        let op = folderMan.remove_relpath(_path);
        let dirC = folderMan.return_safe_contents(path.basename(path.dirname(_path)));
        win.webContents.send("DirContents", {data: dirC, token: token});
        if (!op) {
            win.webContents.send("Message", "<h1>File Operation Error</h1>We couldn't remove that path.");
        }
    });

    ipcMain.on('AvailableForUpdates', (e,args) => {
        appMan.checkVersion(SHELL_VERSION).then((result) => {
            if (result) {
                if (SHELL_PATH == null) {
                    win.webContents.send("GetShellPath", "");
                    setTimeout(() => {
                        ipcManLog.info("An update is available!");
                        dialog.showOpenDialog({ properties: ['openFile'], title: "Your shell needs updating. Please select your shell EXE." }).then((path) => {
                            if (path.canceled) {
                                win.webContents.send("Message", "<h1>Error</h1>There was an error whilst trying to update your shell. Restart your computer please.");
                                return;
                            }
                            SHELL_PATH = path.filePaths[0];
                            win.webContents.send("Message", "<h1>Updating...</h1>Give us a moment while we update your Shell. Your computer should automatically restart after the update.");
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

    ipcMain.on('RunApp', (e, args) => {
        ipcManLog.info("RunApp request");
        let RealAppPath = folderMan.relpath_to_realpath(args);
        let Mainfile = "INDEX.HTML";

        let appKey = args.replace(path.dirname(args), "").replace("/", "").replace("\\", "");
        ipcManLog.info("Trying to run app: " + appKey);

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
            win.webContents.send('RunApp', {name: name, uuid: uuid, path: app_path, key: appKey});
            //win.loadFile('ui/RUNFILE.HTML');
            return;
        } else {
            win.webContents.send("Message", "<h1>Error</h1>We couldn't run that app! (No Mainfile present)");
            return;
        }
    });

    ipcMain.on('InstallApplication', (e, args) => {
        ipcManLog.info("InstallApp request");
        appMan.appExists(args).then((result) => {
            if (result) {
                dialog.showMessageBox(win, {title: "Install '" + args + "'?", message: "Do you want to install the application '" + args + "'?\nIf you do not remember wanting to install this application, click on No.", buttons: ["Yes", "No"]}).then((data) => {
                    if (data.response == 0) {
                        appMan.install(args, SHELL_VERSION).then((result) => {
                            setTimeout(() => {
                                let Applications = appMan.getInstalledApplications();
                                win.webContents.send('ApplicationsList', Applications);
                                appMan.returnSafeAppList(SHELL_VERSION).then((applist) => {
                                    win.webContents.send("AppList", {data: applist, token: "*"});
                                })
                            }, 500)
                        });
                    }
                });
            } else {
                ipcManLog.info("InstallApp request: App does not exist");
            }
        })
    });

    ipcMain.on('UninstallApplication', (e, args) => {
        ipcManLog.info("UninstallApp request");
        if (appMan.appExistsLocal(args)) {
            dialog.showMessageBox(win, {title: "Uninstall '" + args + "'?", message: "Do you want to remove the application '" + args + "'?\nIf you do not remember wanting to remove this application, click on No.", buttons: ["Yes", "No"]}).then((data) => {
                if (data.response == 0) {
                    appMan.uninstallApp(args);
                    let Applications = appMan.getInstalledApplications();
                    win.webContents.send('ApplicationsList', Applications);
                    appMan.returnSafeAppList(SHELL_VERSION).then((applist) => {
                        win.webContents.send("AppList", {data: applist, token: "*"});
                    })
                }
            });
        }
    })

    ipcMain.on('GetApplications', (e, args) => {
        ipcManLog.info("GetApps request");
        let Applications = appMan.getInstalledApplications();
        win.webContents.send('ApplicationsList', Applications);
    });
}

module.exports = {
    init,
    manageIPC
}