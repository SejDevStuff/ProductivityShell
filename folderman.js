const path = require('path');
const fs = require('fs');

var ROOT_PATH = "";
var APP_PATH = "";
var APP_CACHE_PATH = "";

var progInit = false;

function init() {
    console.log("[FolderManager] Initialising Folder Manager ...");
    ROOT_PATH = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
    
    ROOT_PATH = path.join(ROOT_PATH, "prodsuite_data");
    if (!fs.existsSync(ROOT_PATH)) {
        fs.mkdirSync(ROOT_PATH);
    }

    APP_PATH = path.join(ROOT_PATH, "Applications");
    if (!fs.existsSync(APP_PATH)) {
        fs.mkdirSync(APP_PATH);
    }

    APP_CACHE_PATH = path.join(ROOT_PATH, "ApplicationCache");
    if (!fs.existsSync(APP_CACHE_PATH)) {
        fs.mkdirSync(APP_CACHE_PATH);
    }

    progInit = true;
}

function make_dir(dirpath) {
    if (!progInit) {
        console.log("[FolderManager] Please run init() before using any other function!");
        return;
    }

    console.log("[FolderManager] Making path " + dirpath);

    dirpath = path.join(ROOT_PATH, dirpath);
    dirpath = path.resolve(dirpath);

    if (!dirpath.startsWith(ROOT_PATH)) {
        console.log("[FolderManager] WARN: dirpath does not start with ROOT_PATH");
        return;
    }

    if (fs.existsSync(dirpath)) {
        console.log("[FolderManager] WARN: already exists");
        return;
    }

    try {
        fs.mkdirSync(dirpath);
    } catch (e) {
        console.log("[FolderManager] ERROR: cannot make directory");
    }
}

function relpath_to_realpath(relpath) {
    if (!progInit) {
        console.log("[FolderManager] Please run init() before using any other function!");
        return;
    }
    console.log("[FolderManager] Getting RELPATH: " + relpath);
    let realpath = path.resolve(path.join(ROOT_PATH, relpath));
    if (!realpath.startsWith(ROOT_PATH)) {
        realpath = ROOT_PATH;
    }
    console.log("[FolderManager] Resolved REALPATH: " + realpath);
    return realpath;
}

function realpath_to_relpath(realpath) {
    if (!progInit) {
        console.log("[FolderManager] Please run init() before using any other function!");
        return;
    }
    return path.resolve(realpath.replace(ROOT_PATH, "/"));
}

function return_safe_contents(dirpath) {
    if (!progInit) {
        console.log("[FolderManager] Please run init() before using any other function!");
        return;
    }

    console.log("[FolderManager] Getting path " + dirpath)

    var Data = {
        _dpath: "/",
        contents: []
    };

    dirpath = path.join(ROOT_PATH, dirpath);
    dirpath = path.resolve(dirpath);
    
    if (!dirpath.startsWith(ROOT_PATH)) {
        console.log("[FolderManager] WARN: dirpath does not start with ROOT_PATH, defaulting to ROOT_PATH");
        dirpath = ROOT_PATH;
    }

    if (!fs.existsSync(dirpath)) {
        console.log("[FolderManager] WARN: doesn't exist");
        return Data;
    }

    if (!fs.lstatSync(dirpath).isDirectory()) {
        console.log("[FolderManager] WARN: not a directory");
        return Data;
    }

    var contents = fs.readdirSync(dirpath);

    for (let i = 0; i < contents.length; i++) {
        var _file = path.join(dirpath, contents[i]);

        if (fs.lstatSync(_file).isDirectory() == true) {
            Data.contents.push({ type: 1, rel_f_path: path.resolve(_file.replace(ROOT_PATH, "/")), f_name: path.basename(_file) });
        } else if (fs.lstatSync(_file).isFile() == true) {
            if (_file.endsWith(".rtf")) {
                Data.contents.push({ type: 0, rel_f_path: path.resolve(_file.replace(ROOT_PATH, "/")), f_name: path.basename(_file) });
            }
        }
    }

    Data._dpath = path.resolve(dirpath.replace(ROOT_PATH, "/"));

    return Data;
}

function returnAppPath() {
    return APP_PATH;
}

function returnAppCachePath() {
    return APP_CACHE_PATH;
}

function returnRootPath() {
    return ROOT_PATH;
}

module.exports = {
    return_safe_contents,
    init,
    make_dir,
    relpath_to_realpath,
    realpath_to_relpath,
    returnAppPath,
    returnAppCachePath,
    returnRootPath
}