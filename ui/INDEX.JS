window.onload = () => {

    document.getElementById("search_input").onkeyup = filterAppList;

    window.api.get_application_list();
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

    window.api.show_available_for_updates();

    document.getElementById('_shutdown_').onclick = window.api.shutdown_computer;
    document.getElementById('_restart_').onclick = window.api.restart_computer;
}

window.onclick = (e) => {
    let element = e.target;
    if (element.classList.contains("app")) {
        var appPath = element.id;
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

function destroyApp(uuid) {
    document.body.removeChild(document.getElementById(uuid));
}

window.api.sock_on('RunApp', (e, data) => {
    let uuid = data.uuid;
    let name = data.name;
    let path = data.path;
    if (uuid === undefined || name === undefined || path === undefined) {
        msgBox("Oops! We couldn't run this app. (unknown parameters)");
        return;
    }
    runApp(name, path, uuid);
})

function runApp(name, path, uuid) {
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

function msgBox(msg) {
    if ((modal === null) == false) {
        modal.close();
    }
    modal = new tingle.modal({
        footer: false,
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: "Close",
        cssClass: ["modal"],
        onClose: function() {
            modal.destroy();
        }
    });
    modal.setContent(msg);
    modal.open();
}

window.api.sock_on('Message', (e, data) => {
    msgBox(data);
});

window.api.sock_on('GetShellPath', (e, data) => {
    msgBox("Your shell needs updating. Please select your shell EXE from the dialogue which opened.<br><b>Accidentally closed it?</b> Just restart your machine.");
});