var ROOT_PATH = "";
var APP_PATH = "";
var APP_CACHE_PATH = "";
var APP_DATA_PATH = "";

var APP_REPO = "http://prodsuite-appstore.glitch.me/";

var foldermanInstance = null;

const axios = require('axios');
const fs = require('fs');
var path = require('path');
const { v4 : uuidv4 } = require('uuid');
const unzip = require('unzipper');
const { spawn } = require('child_process');
const log = require('electron-log');
const appManLog = log.scope("AppManager");

var progInit = false;

function init(folderman) {
    appManLog.info("Initialising App Manager ...")
    foldermanInstance = folderman;
    ROOT_PATH = foldermanInstance.returnRootPath();
    APP_PATH = foldermanInstance.returnAppPath();
    APP_CACHE_PATH = foldermanInstance.returnAppCachePath();
    APP_DATA_PATH = foldermanInstance.returnAppDataPath();
    progInit = true;
}

async function getAppList() {
    if (!progInit) {
        appManLog.error("Please run init() before using any other function!");
        return;
    }

    let res = await axios.get(path.join(APP_REPO, "/apps.json"));
    let appDb = res.data || {};
    return appDb;
}

async function appExists(appName) {
    let appdb = await getAppList();
    if ((appdb[appName] === undefined) == false) {
        return true;
    } else {
        return false;
    }
}

async function downloadFile(fileUrl, outputLocationPath) {
    const writer = fs.createWriteStream(outputLocationPath);

    return axios({
        method: 'get',
        url: fileUrl,
        responseType: 'stream',
    }).then(response => {
        return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error = null;
        writer.on('error', err => {
            error = err;
            writer.close();
            reject(err);
        });
        writer.on('close', () => {
            if (!error) {
            resolve(true);
            }
        });
        });
    });

}

async function _install(url, mode, dest, version) {
    let tmp_loc = path.join(APP_CACHE_PATH, uuidv4());
    await downloadFile(url, tmp_loc);
    if (fs.existsSync(dest)) {
        if (mode == "FILE") {
            fs.unlinkSync(dest);
        } else if (mode == "DIR") {
            fs.rmSync(dest, {recursive: true});
        }
    }

    let installFile = {version: version};
    appManLog.info("Dest: " + dest);

    if (mode == "FILE") {
        fs.copyFileSync(tmp_loc, dest);
        fs.writeFileSync(dest + ".Install", JSON.stringify(installFile));
        fs.unlinkSync(tmp_loc);
    } else if (mode == "DIR") {
        let readstream = fs.createReadStream(tmp_loc).pipe(unzip.Extract({path: dest}));
        readstream.on('close', (err) => {
            fs.writeFileSync(path.join(dest, ".Install"), JSON.stringify(installFile));
            fs.unlinkSync(tmp_loc);
        });
    }

    appManLog.info("Install Successful!");
    return;
}

async function checkVersion(ver) {
    let res = await axios.get(path.join(APP_REPO, "shellver.txt"));
    var version = parseInt(res.data);
    if (version > ver) {
        return true;
    } else {
        return false;
    }
}

async function returnSafeAppList(shellver) {
    let appList = await getAppList();
    let safeAppList = [];
    for (const key in appList) {
        if(appList.hasOwnProperty(key)) {
            let app = appList[key];
            let appEntry = {
                Key: key,
                Name: app.Name || key,
                Desc: app.Description || "Not provided",
                Installed: false,
                NeedUpgrade: false,
                Compatible: false
            };
            if (app.Listing == true) {
                let shell_compatible_minimum = app.ShellCompatibleMinimum;
                if ((shell_compatible_minimum === undefined) == false) {
                    if (shellver >= shell_compatible_minimum) {
                        appEntry.Compatible = true;
                    }
                }

                let install_path = path.join(APP_PATH, app.InstallPath);
                if (!install_path.startsWith(APP_PATH)) {
                    appManLog.error("Invalid install path");
                    continue;
                }
                if (fs.existsSync(install_path)) {
                    appEntry.Installed = true;

                    let installFileLoc = "";
                    if (app.InstallMode == "FILE") {
                        installFileLoc = install_path + ".Install";
                    } else if (app.InstallMode == "DIR") {
                        installFileLoc = path.join(install_path, ".Install");
                    }

                    if (fs.existsSync(installFileLoc)) {
                        let version = null;
                        try {
                            let installFile = JSON.parse(fs.readFileSync(installFileLoc));
                            version = installFile.version;
                        } catch (e) {}
                        if (version == null) {
                            appManLog.error("Corrupt InstallFile");
                            continue;
                        }

                        if (app.Version > version) {
                            appEntry.NeedUpgrade = true;
                        }
                    } else {
                        appManLog.error("No InstallFile");
                        continue;
                    }
                }
                safeAppList.push(appEntry);
            }
        }
    }
    let installedApps = fs.readdirSync(APP_PATH);
    for (let i = 0; i < installedApps.length; i++) {
        let app = installedApps[i];
        if (app.endsWith(".Install")) {
            continue;
        }
        let found = false;
        for (let j = 0; j < safeAppList.length; j++) {
            if (safeAppList[j].Key == app) {
                found = true;
                break;
            }
        }
        if (!found) {
            let appEntry = {
                Key: app,
                Name: app,
                Desc: "Locally installed application",
                Installed: true,
                NeedUpgrade: false,
                Compatible: true
            };
            safeAppList.push(appEntry)
        }
    }
    return safeAppList;
}

async function updateShell(shell_path_dsk) {
    let shell_lnk = await axios.get(path.join(APP_REPO, "shelllnk.txt"));
    try {
        let lnk = shell_lnk.data;
        await downloadFile(lnk, shell_path_dsk + ".dl");
        fs.writeFileSync(shell_path_dsk + ".update.bat", "@echo off\ntitle Update\ntimeout /t 2 /nobreak >nul\nmove /Y " + shell_path_dsk + ".dl" + " " + shell_path_dsk + "\nshutdown /r /t 0");
        const child = spawn("cmd.exe", ["/c", shell_path_dsk + ".update.bat"], {
            detached: true,
            stdio: "ignore"
        });
        child.unref();
        return true;
    } catch (e) {
        return false;
    }
}

function appExistsLocal(appName) {
    let install_path = path.join(APP_PATH, appName);
    if (!install_path.startsWith(APP_PATH)) {
        appManLog.error("Invalid install path");
        return false;
    }
    if (fs.existsSync(install_path)) {
        return true;
    } else {
        appManLog.error("App doesn't exist");
        return false;
    }
}

function uninstallApp(AppName) {
    appManLog.info("Uninstalling " + AppName);
    let install_path = path.join(APP_PATH, AppName);
    if (!install_path.startsWith(APP_PATH)) {
        appManLog.error("Invalid install path");
        return;
    }
    if (fs.existsSync(install_path)) {
        if (fs.lstatSync(install_path).isDirectory()) {
            fs.rmSync(install_path, {recursive: true});
        } else if (fs.lstatSync(install_path).isFile()) {
            fs.unlinkSync(install_path);
            if (fs.existsSync(install_path + ".Install")) {
                fs.unlinkSync(install_path + ".Install");
            }
        }
    } else {
        appManLog.error("App doesn't exist");
    }
}

async function install(AppName, ShellVer) {
    if (!progInit) {
        appManLog.error("Please run init() before using any other function!");
        return;
    }

    let appList = await getAppList();

    if (appList[AppName] === undefined) {
        appManLog.error("Cannot install app '" + AppName + "', doesn't exist.")
        return false;
    }
    appManLog.info("Downloading application ...");
    let app = appList[AppName];
    let install_path = path.join(APP_PATH, app.InstallPath);
    if (!install_path.startsWith(APP_PATH)) {
        appManLog.error("Invalid install path");
        return;
    }
    let shell_compatible_minimum = app.ShellCompatibleMinimum;
    let compatible = false;
    if ((shell_compatible_minimum === undefined) == false) {
        if (ShellVer >= shell_compatible_minimum) {
            compatible = true;
        }
    }
    if (!compatible) {
        appManLog.error("Not compatible");
        return;
    }
    if (fs.existsSync(install_path)) {
        let installFileLoc = "";

        if (app.InstallMode == "FILE") {
            installFileLoc = install_path + ".Install";
        } else if (app.InstallMode == "DIR") {
            installFileLoc = path.join(install_path, ".Install");
        }

        if (fs.existsSync(installFileLoc)) {
            let version = null;
            try {
                let installFile = JSON.parse(fs.readFileSync(installFileLoc));
                version = installFile.version;
            } catch (e) {}
            if (version == null) {
                appManLog.error("Corrupt InstallFile");
                return;
            }

            if (app.Version > version) {
                // UPGRADE
                await _install(app.FileLink, app.InstallMode, install_path, app.Version);
            } else {
                appManLog.info("No need to upgrade");
                return;
            }
        } else {
            appManLog.error("No InstallFile");
            return;
        }
    } else {
        // INSTALL
        await _install(app.FileLink, app.InstallMode, install_path, app.Version);
    }
}

function getInstalledApplications() {
    appManLog.info("GetInstalledApps request")
    var Applications = [];
    var AvailableApps = foldermanInstance.return_safe_contents(foldermanInstance.realpath_to_relpath(APP_PATH));
    if (AvailableApps.contents.length != 0) {
        for (let i = 0; i < AvailableApps.contents.length; i++) {
            let App = AvailableApps.contents[i];
            let AppObj = {IconPath: "/Applications/Unknown.png", Name: App.rel_f_path, Path: App.rel_f_path};
            if (App.type == 1) {
                let RealAppPath = foldermanInstance.relpath_to_realpath(App.rel_f_path);
                if (fs.existsSync(path.join(RealAppPath, "Icon.png"))) {
                    AppObj.IconPath = foldermanInstance.realpath_to_relpath(path.join(RealAppPath, "Icon.png"));
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
    return Applications;
}

module.exports = {
    init, 
    install,
    checkVersion,
    updateShell,
    returnSafeAppList,
    appExists,
    uninstallApp,
    appExistsLocal,
    getInstalledApplications
}