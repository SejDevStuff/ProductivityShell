# Productivity Shell
Alternate shell for Windows.

Productivity Shell is a severely locked-down shell for Windows. It features it's own Application Store and is aimed at people who tend to procrasinate a lot (like myself)

## How to change shell
Place the ``shell.exe`` in a folder in your Desktop (*).
Open regedit.exe.
Change ``HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\Shell`` from ``explorer.exe`` to the path to the new ``shell.exe``.
Restart your machine.

(*) It is important that the shell is in your Desktop or other similarly writeable folder, otherwise the update process would fail.

## Data directory
The shell creates a data directory in ``%APPDATA%\prodsuite_data`` where it stores application files, application data, caches, and any other relevant data.