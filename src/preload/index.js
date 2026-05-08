"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    config: {
        get: () => electron_1.ipcRenderer.invoke('config:get'),
        set: (config) => electron_1.ipcRenderer.invoke('config:set', config),
    },
    drafts: {
        fetch: () => electron_1.ipcRenderer.invoke('drafts:fetch'),
        list: (productId) => electron_1.ipcRenderer.invoke('drafts:list', productId),
    },
    quota: {
        get: () => electron_1.ipcRenderer.invoke('quota:get'),
    },
    logs: {
        get: () => electron_1.ipcRenderer.invoke('logs:get'),
        clear: () => electron_1.ipcRenderer.invoke('logs:clear'),
    },
    scheduler: {
        get: () => electron_1.ipcRenderer.invoke('scheduler:get'),
        set: (config) => electron_1.ipcRenderer.invoke('scheduler:set', config),
        start: () => electron_1.ipcRenderer.invoke('scheduler:start'),
        stop: () => electron_1.ipcRenderer.invoke('scheduler:stop'),
    },
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
