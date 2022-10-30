const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    get_application_list: () => ipcRenderer.send('GetApplications'),
    sock_on: ipcRenderer.on.bind(ipcRenderer),
    run_app: (appPath) => ipcRenderer.send('RunApp', appPath),
    show_available_for_updates: () => ipcRenderer.send('AvailableForUpdates'),
    shutdown_computer: () => ipcRenderer.send('ShutdownComputer'),
    restart_computer: () => ipcRenderer.send('RestartComputer'),

    get_online_app_list: () => ipcRenderer.send('GetOnlineAppList'),
    install_app: (appName) => ipcRenderer.send('InstallApplication', appName),
    uninstall_app: (appName) => ipcRenderer.send('UninstallApplication', appName),

    // fs
    read_file: (filepath) => ipcRenderer.send('ReadFile', filepath),
    write_file: (filepath, data) => ipcRenderer.send('WriteFile', {path: filepath, data: data}),
    read_dir: (dirpath) => ipcRenderer.send("ReadDirectory", dirpath),
    make_dir: (dirpath) => ipcRenderer.send("MakeDirectory", dirpath),
    remove: (path) => ipcRenderer.send('Remove', path)
})