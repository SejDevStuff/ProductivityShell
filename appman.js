var ROOT_PATH = "";
var APP_PATH = "";
var APP_CACHE_PATH = "";

var APP_REPO = "http://prodsuite-appstore.glitch.me/";

var foldermanInstance = null;

const axios = require('axios');
const fs = require('fs');
var path = require('path');
const { v4 : uuidv4 } = require('uuid');
const unzip = require('unzipper');
const { spawn } = require('child_process');

var progInit = false;

function init(folderman) {
    console.log("[AppManager] Initialising App Manager ...")
    foldermanInstance = folderman;
    ROOT_PATH = foldermanInstance.returnRootPath();
    APP_PATH = foldermanInstance.returnAppPath();
    APP_CACHE_PATH = foldermanInstance.returnAppCachePath();
    progInit = true;
}

async function getAppList() {
    if (!progInit) {
        console.log("[AppManager] Please run init() before using any other function!");
        return;
    }

    let res = await axios.get(path.join(APP_REPO, "/apps.json"));
    let appDb = res.data || {};
    return appDb;
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
            fs.rmdirSync(dest);
        }
    }

    let installFile = {version: version};
    console.log("[AppManager] Dest: " + dest);

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

    console.log("[AppManager] Install Successful!");
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

async function install(AppName) {
    if (!progInit) {
        console.log("[AppManager] Please run init() before using any other function!");
        return;
    }

    let appList = await getAppList();

    if (appList[AppName] === undefined) {
        console.log("[AppManager] Cannot install app '" + AppName + "', doesn't exist.")
        return false;
    }
    console.log("[AppManager] Downloading application ...");
    let app = appList[AppName];
    let install_path = path.join(APP_PATH, app.InstallPath);
    if (!install_path.startsWith(APP_PATH)) {
        console.log("[AppManager] Invalid install path");
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
                console.log("[AppManager] Corrupt InstallFile");
                return;
            }

            if (app.Version > version) {
                // UPGRADE
                await _install(app.FileLink, app.InstallMode, install_path, app.Version);
            } else {
                console.log("[AppManager] No need to upgrade");
                return;
            }
        } else {
            console.log("[AppManager] No InstallFile");
            return;
        }
    } else {
        // INSTALL
        await _install(app.FileLink, app.InstallMode, install_path, app.Version);
    }
}

module.exports = {
    init, 
    install,
    checkVersion,
    updateShell
}