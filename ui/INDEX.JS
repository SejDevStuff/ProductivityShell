window.onload = () => {

    document.getElementById("search_input").onkeyup = filterAppList;

    window.api.sock_on('ApplicationsList', (e, data) => {
        let appBox = document.getElementById("app_box");
        if (data.length == 0) {
            appBox.innerHTML = "No applications installed";
            return;
        }
        appBox.innerHTML = "";
        for (let i = 0; i < data.length; i++) {
            let AppName = data[i].Name;
            let AppPath = data[i].Path;
            let AppIcon = data[i].IconPath;
            let AppBox = document.createElement("span");
            AppBox.classList.add("app");
            AppBox.innerHTML = "<img src='atom://" + AppIcon + "' width='50' height='50'>" + AppName;
            AppBox.id = AppPath;
            appBox.appendChild(AppBox);
        }
    });

    window.api.check_for_updates();

    document.getElementById('_shutdown_').onclick = window.api.shutdown_computer;
    document.getElementById('_reboot_').onclick = window.api.restart_computer;
    document.getElementById("refresh_app_list").onclick = refreshAppList;
    document.getElementById("updateBtn").onclick = window.api.update;
}

function refreshAppList() {
    let appBox = document.getElementById("app_box");
    appBox.innerHTML = "Loading applications ...";
    window.api.get_application_list();
}

window.onclick = (e) => {
    let element = e.target;
    if (element.classList.contains("app")) {
        var appPath = element.id;
        if (hiccupped) return;
        window.api.run_app(appPath);
    }
}

function filterAppList() {
    var input = document.getElementById("search_input");
    var filter = input.value.toUpperCase();

    var apps = document.getElementsByClassName("app");

    for (let i = 0; i < apps.length; i++) {
        var app = apps[i];
        var txtValue = app.textContent || app.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            apps[i].style.display = "";
        } else {
            apps[i].style.display = "none";
        }
    }
}

let APP_UUIDS = [];

function destroyApp(uuid) {
    document.body.removeChild(document.getElementById(uuid));
    APP_UUIDS = APP_UUIDS.filter(x => x !== uuid);
}

window.api.sock_on('RunApp', (e, data) => {
    let uuid = data.uuid;
    let name = data.name;
    let path = data.path;
    let key = data.key;
    if (uuid === undefined || name === undefined || path === undefined || key === undefined) {
        msgBox("Oops! We couldn't run this app. (unknown parameters)");
        return;
    }
    runApp(name, path, uuid, key);
})

function open_file(fpath) {
    msgBox("You do not have a program installed which can open this file");
}

let ALLOWED_APP_FUNC = {
    on: null,
    get_online_app_list: null,
    install_app: window.api.install_app,
    uninstall_app: window.api.uninstall_app,
    read_dir: null,
    make_dir: null,
    read_file: null,
    write_file: null,
    remove: null,
    open_file: open_file,
    move_file: null,
    copy_file: null
};

let _TMP_ALLOWED_APP_FUNC = {};

function destroyAllApps() {
    let apps = APP_UUIDS;
    let _apps = apps;
    for (let i = 0; i < _apps.length; i++) {
        let app = _apps[i];
        destroyApp(app);
    }
}

function hiccup() {
    hiccupped = true;
    destroyAllApps();
    for (const key in ALLOWED_APP_FUNC) {
        if (ALLOWED_APP_FUNC.hasOwnProperty(key)) {
            _TMP_ALLOWED_APP_FUNC[key] = ALLOWED_APP_FUNC[key];
        }
    }
    ALLOWED_APP_FUNC = {};
    msgBox("<h1>Uh oh!</h1>Something went wrong! Don't worry: we're trying to fix the issue. Your apps will stop working temporarily as a safety feature.");
}

function hiccupEnd() {
    destroyAllApps();
    for (const key in _TMP_ALLOWED_APP_FUNC) {
        if (_TMP_ALLOWED_APP_FUNC.hasOwnProperty(key)) {
            ALLOWED_APP_FUNC[key] = _TMP_ALLOWED_APP_FUNC[key];
        }
    }
    _TMP_ALLOWED_APP_FUNC = {};
    hiccupped = false;
    msgBox("<h1>Crisis averted!</h1>We had encountered a hiccup, but it's all fixed now! Sorry for the inconvenience.");
}

let hiccupped = false;

function runApp(name, path, uuid, key) {
    if (hiccupped) return;

    let appWindow = document.createElement('div');
    appWindow.classList.add("draggable");
    appWindow.id = uuid;

    let appTopBar = document.createElement('div');
    appTopBar.classList.add("handle");
    appTopBar.innerText = name;

    let appCloseBtn = document.createElement("button");
    appCloseBtn.onclick = () => {destroyApp(uuid)}
    appCloseBtn.innerText = "Close";
    appTopBar.appendChild(appCloseBtn);

    appWindow.appendChild(appTopBar);

    let appFrame = document.createElement('iframe');
    appFrame.src = path;
    appFrame.frameBorder = 0;
    appFrame.allowFullscreen = "";
    appFrame.classList.add("appFrame");
    appFrame.sandbox = "allow-scripts";

    appWindow.appendChild(appFrame);

    let localAppFunc = ALLOWED_APP_FUNC;

    localAppFunc.get_online_app_list = () => {
        window.api.get_online_app_list(uuid);
    }

    localAppFunc.read_file = (filepath) => {
        window.api.read_file(filepath, uuid);
    }

    localAppFunc.read_dir = (filepath) => {
        window.api.read_dir(filepath, uuid);
    }

    localAppFunc.write_file = (filepath, data) => {
        window.api.write_file(filepath, data, uuid);
    }

    localAppFunc.make_dir = (dirpath) => {
        window.api.make_dir(dirpath, uuid);
    }

    localAppFunc.remove = (path) => {
        window.api.remove(path, uuid);
    }

    localAppFunc.move_file = (src, dest) => {
        window.api.move_file(src, dest, uuid);
    }

    localAppFunc.copy_file = (src, dest) => {
        window.api.copy_file(src, dest, uuid);
    }

    // make sure applications only get events THEY are supposed to get.
    
    localAppFunc.on = (channel, listener) => {
        if (channel == "AppList" || channel == "FileContents" || channel == "DirContents") {
            window.api.sock_on(channel, (evt, data) => {
                try {
                    if ((data.data === undefined) == false && (data.token === undefined) == false) {
                        if (data.token == uuid || data.token == "*") {
                            listener(evt, data.data);
                        }
                    } else {
                        return;
                    }
                } catch (e) {
                    return;
                }
            });
        }
    }

    appFrame.onload = () => {
        appFrame.contentWindow.window.functions = {};
        for (const key in localAppFunc) {
            if (localAppFunc.hasOwnProperty(key)) {
                appFrame.contentWindow.window.functions[key] = localAppFunc[key];
            }
        }
        appFrame.contentWindow.postMessage("AppReady", "*");
    };

    APP_UUIDS.push(uuid);
    document.body.appendChild(appWindow);

    $("#" + uuid).draggable({
        handle: ".handle",
        iframeFix: true,
        start: function(event, ui) {
            $('.frameOverlay').show();
        },
        stop: function(event, ui) {
            $(".frameOverlay").hide();
        },
        stack: 'div'
    }).css("position", "absolute");
    $("#" + uuid).resizable();
}

var modal = null;
let unclosableModal = false;

function msgBox(msg) {
    if ((modal === null) == false) {
        modal.close();
    }
    if (unclosableModal) return;
    modal = new tingle.modal({
        footer: false,
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: "Close",
        cssClass: ["modal"],
        onClose: function() {
            modal.destroy();
            modal = null;
        }
    });
    modal.setContent(msg);
    modal.open();
}

function uncloseableModal(msg) {
    let modal2 = new tingle.modal({
        footer: false,
        stickyFooter: false,
        closeMethods: [],
        cssClass: ["modal"],
    });
    modal2.setContent(msg);
    modal2.open();
    unclosableModal = true;
    hiccup();
}

window.api.sock_on('Message', (e, data) => {
    msgBox(data);
});

window.api.sock_on('UnclosableModal', (e, data) => {
    uncloseableModal(data);
});

window.api.sock_on("UpdateAvailable", (e, data) => {
    document.getElementById("updateAvailable").style.display = "inline";
});

window.api.sock_on("Hiccup", (e, data) => {
    hiccup();
});

window.api.sock_on("HiccupEnd", (e, data) => {
    hiccupEnd();
});