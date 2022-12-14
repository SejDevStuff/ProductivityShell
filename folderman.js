const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const log = require('electron-log');
const folderManLog = log.scope("FolderManager");

var ROOT_PATH = "";
var APP_PATH = "";
var APP_CACHE_PATH = "";
var APP_DATA_PATH = "";

var progInit = false;

function init() {
    folderManLog.info("Initialising Folder Manager ...");
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

    APP_DATA_PATH = path.join(ROOT_PATH, "ApplicationData");
    if (!fs.existsSync(APP_DATA_PATH)) {
        fs.mkdirSync(APP_DATA_PATH);
    }

    progInit = true;
}

function doAllFoldersExist() {
    let rp = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
    rp = path.join(rp, "prodsuite_data");
    if (!fs.existsSync(rp)) {
        return false;
    }
    let ap = path.join(rp, "Applications");
    if (!fs.existsSync(ap)) {
        return false;
    }
    let acp = path.join(rp, "ApplicationCache");
    if (!fs.existsSync(acp)) {
        return false;
    }
    let adp = path.join(rp, "ApplicationData");
    if (!fs.existsSync(adp)) {
        return false;
    }
    return true;
}

function make_dir_relpath(dirpath) {
    if (!progInit) {
        folderManLog.error("Please run init() before using any other function!");
        return false;
    }

    folderManLog.info("Making path " + dirpath);

    dirpath = formatPath(dirpath);

    dirpath = path.join(ROOT_PATH, dirpath);
    dirpath = path.resolve(dirpath);

    if (!dirpath.startsWith(ROOT_PATH)) {
        folderManLog.warn("Dirpath does not start with ROOT_PATH");
        return false;
    }

    if (fs.existsSync(dirpath)) {
        folderManLog.warn("Already exists");
        return false;
    }

    try {
        fs.mkdirSync(dirpath);
        return true;
    } catch (e) {
        folderManLog.error("Cannot make directory");
        return false;
    }
}

function copy_file_relpath(relpath_src, relpath_dest) {
    if (!progInit) {
        folderManLog.error("Please run init() before using any other function!");
        return false;
    }
    relpath_src = formatPath(relpath_src);
    relpath_dest = formatPath(relpath_dest);

    relpath_src = path.join(ROOT_PATH, relpath_src);
    relpath_src = path.resolve(relpath_src);

    relpath_dest = path.join(ROOT_PATH, relpath_dest);
    relpath_dest = path.resolve(relpath_dest);

    if (!relpath_src.startsWith(ROOT_PATH) && !relpath_dest.startsWith(ROOT_PATH)) {
        folderManLog.warn("SRC and/or DEST does not start with ROOT_PATH");
        return false;
    }

    if (relpath_dest.startsWith(relpath_src)) {
        folderManLog.warn("Destination cannot be inside source!");
        return false;
    }

    if (!fs.existsSync(relpath_src)) {
        folderManLog.warn("Source does not exist");
        return false;
    }

    if (fs.existsSync(relpath_dest)) {
        folderManLog.warn("Destination already exists");
        return false;
    }

    try {
        fse.copySync(relpath_src, relpath_dest);
        return true;
    } catch (e) {
        folderManLog.error(e);
        return false;
    }
}

function mv_file_relpath(relpath_src, relpath_dest) {
    if (!progInit) {
        folderManLog.error("Please run init() before using any other function!");
        return false;
    }
    relpath_src = formatPath(relpath_src);
    relpath_dest = formatPath(relpath_dest);

    relpath_src = path.join(ROOT_PATH, relpath_src);
    relpath_src = path.resolve(relpath_src);

    relpath_dest = path.join(ROOT_PATH, relpath_dest);
    relpath_dest = path.resolve(relpath_dest);

    if (!relpath_src.startsWith(ROOT_PATH) && !relpath_dest.startsWith(ROOT_PATH)) {
        folderManLog.warn("SRC and/or DEST does not start with ROOT_PATH");
        return false;
    }

    if (relpath_dest.startsWith(relpath_src)) {
        folderManLog.warn("Destination cannot be inside source!");
        return false;
    }

    if (!fs.existsSync(relpath_src)) {
        folderManLog.warn("Source does not exist");
        return false;
    }

    if (fs.existsSync(relpath_dest)) {
        folderManLog.warn("Destination already exists");
        return false;
    }

    try {
        fse.copySync(relpath_src, relpath_dest);
        if (fs.lstatSync(relpath_src).isFile() == true) {
            fs.unlinkSync(relpath_src);
        } else if (fs.lstatSync(relpath_src).isDirectory() == true) {
            fs.rmSync(relpath_src, {recursive: true});
        }
        return true;
    } catch (e) {
        folderManLog.error(e);
        return false;
    }
}

function remove_relpath(relpath) {
    if (!progInit) {
        folderManLog.error("Please run init() before using any other function!");
        return false;
    }
    relpath = formatPath(relpath);
    let realpath = path.resolve(path.join(ROOT_PATH, relpath));
    if (!realpath.startsWith(ROOT_PATH)) {
        folderManLog.error("Invalid RELPATH for removing");
        return false;
    }
    try {
        if (fs.lstatSync(realpath).isDirectory() == true) {
            fs.rmSync(realpath, {recursive: true});
            return true;
        } else if (fs.lstatSync(realpath).isFile() == true) {
            fs.unlinkSync(realpath);
            return true;
        }
    } catch (e) {
        folderManLog.error(e);
        return false;
    }
}

function write_file_relpath(relpath, data) {
    if (!progInit) {
        folderManLog.error("Please run init() before using any other function!");
        return false;
    }
    relpath = formatPath(relpath);
    let realpath = path.resolve(path.join(ROOT_PATH, relpath));
    if (!realpath.startsWith(ROOT_PATH)) {
        folderManLog.error("Invalid RELPATH for writing");
        return false;
    }
    if (fs.existsSync(realpath)) {
        folderManLog.error("Path exists");
        return false;
    }
    try {
        fs.writeFileSync(realpath, data);
        return true;
    } catch (e) {
        return false;
    }
}

function read_file_relpath(relpath) {
    if (!progInit) {
        folderManLog.error("Please run init() before using any other function!");
        return;
    }
    relpath = formatPath(relpath);
    let realpath = path.resolve(path.join(ROOT_PATH, relpath));
    if (!realpath.startsWith(ROOT_PATH)) {
        folderManLog.error("Invalid RELPATH for reading");
        return null;
    }
    try {
        return fs.readFileSync(relpath);
    } catch (e) {
        return null;
    }
}

function relpath_to_realpath(relpath) {
    if (!progInit) {
        folderManLog.error("Please run init() before using any other function!");
        return;
    }
    relpath = formatPath(relpath);
    let realpath = path.resolve(path.join(ROOT_PATH, relpath));
    if (!realpath.startsWith(ROOT_PATH)) {
        realpath = ROOT_PATH;
    }
    return realpath;
}

function realpath_to_relpath(realpath) {
    if (!progInit) {
        folderManLog.error("Please run init() before using any other function!");
        return;
    }
    return formatPath(realpath.replace(ROOT_PATH, "/"));
}

function formatPath(_path) {
    return _path.replaceAll(path.sep, "/").replaceAll("//", "/");
}

function return_safe_contents(dirpath) {
    if (!progInit) {
        folderManLog.error("Please run init() before using any other function!");
        return;
    }

    var Data = {
        _dpath: "/",
        contents: []
    };

    dirpath = formatPath(dirpath);
    dirpath = path.join(ROOT_PATH, dirpath);
    dirpath = path.resolve(dirpath);
    
    if (!dirpath.startsWith(ROOT_PATH)) {
        folderManLog.warn("Dirpath does not start with ROOT_PATH, defaulting to ROOT_PATH");
        dirpath = ROOT_PATH;
    }

    if (!fs.existsSync(dirpath)) {
        folderManLog.warn("Doesn't exist");
        return Data;
    }

    if (!fs.lstatSync(dirpath).isDirectory()) {
        folderManLog.warn("Not a directory");
        return Data;
    }

    var contents = fs.readdirSync(dirpath);

    for (let i = 0; i < contents.length; i++) {
        var _file = path.join(dirpath, contents[i]);

        if (fs.lstatSync(_file).isDirectory() == true) {
            Data.contents.push({ type: 1, rel_f_path: formatPath(_file.replace(ROOT_PATH, "/")), f_name: path.basename(_file) });
        } else if (fs.lstatSync(_file).isFile() == true) {
            Data.contents.push({ type: 0, rel_f_path: formatPath(_file.replace(ROOT_PATH, "/")), f_name: path.basename(_file) });
        }
    }

    Data._dpath = formatPath(dirpath.replace(ROOT_PATH, "/"));

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

function returnAppDataPath() {
    return APP_DATA_PATH;
}

module.exports = {
    return_safe_contents,
    init,
    make_dir_relpath,
    write_file_relpath,
    read_file_relpath,
    remove_relpath,
    relpath_to_realpath,
    realpath_to_relpath,
    returnAppPath,
    returnAppCachePath,
    returnRootPath,
    returnAppDataPath,
    doAllFoldersExist,
    copy_file_relpath,
    mv_file_relpath
}