const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    get_application_list: () => ipcRenderer.send('GetApplications'),
    sock_on: ipcRenderer.on.bind(ipcRenderer),
    run_app: (appPath) => ipcRenderer.send('RunApp', appPath),
    go_to_main: () => ipcRenderer.send('GoToMain'),
    show_available_for_updates: () => ipcRenderer.send('AvailableForUpdates'),
    shutdown_computer: () => ipcRenderer.send('ShutdownComputer'),
    restart_computer: () => ipcRenderer.send('RestartComputer')
})