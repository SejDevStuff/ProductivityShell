const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    get_application_list: () => ipcRenderer.send('GetApplications'),
    sock_on: ipcRenderer.on.bind(ipcRenderer),
    run_app: (appPath) => ipcRenderer.send('RunApp', appPath),
    show_available_for_updates: () => ipcRenderer.send('AvailableForUpdates'),
    shutdown_computer: () => ipcRenderer.send('ShutdownComputer'),
    restart_computer: () => ipcRenderer.send('RestartComputer'),

    get_online_app_list: (submission_token) => ipcRenderer.send('GetOnlineAppList', submission_token),
    install_app: (appName) => ipcRenderer.send('InstallApplication', appName),
    uninstall_app: (appName) => ipcRenderer.send('UninstallApplication', appName),

    // fs
    read_file: (filepath, submission_token) => ipcRenderer.send('ReadFile', {path: filepath, token: submission_token}),
    write_file: (filepath, data, submission_token) => ipcRenderer.send('WriteFile', {path: filepath, data: data, token: submission_token}),
    read_dir: (dirpath, submission_token) => ipcRenderer.send("ReadDirectory", {path: dirpath, token: submission_token}),
    make_dir: (dirpath, submission_token) => ipcRenderer.send("MakeDirectory", {path: dirpath, token: submission_token}),
    remove: (path, submission_token) => ipcRenderer.send('Remove', {path: path, token: submission_token}),
    move_file: (src, dest, submission_token) => ipcRenderer.send('MoveFile', {src: src, dest: dest, token: submission_token}),
    copy_file: (src, dest, submission_token) => ipcRenderer.send("CopyFile", {src: src, dest: dest, token: submission_token})
})