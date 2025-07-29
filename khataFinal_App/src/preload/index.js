// src/preload/index.js
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  auth: {
    register: (data) => ipcRenderer.invoke('auth:register', data),
    login: (data) => ipcRenderer.invoke('auth:login', data),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
    setSession: (session) => ipcRenderer.invoke('auth:setSession', session) // optional
  },

  transactions: {
    create: (data) => ipcRenderer.invoke('transactions:create', data),
    getLastEndingNumber: () => ipcRenderer.invoke('transactions:getLastEndingNumber'),
    getAll: () => ipcRenderer.invoke('transactions:getAll'),
    getById: (id) => ipcRenderer.invoke('transactions:getById', id),
    update: (payload) => ipcRenderer.invoke('transactions:update', payload),
    delete: (id) => ipcRenderer.invoke('transactions:delete', id),
    deleteBookByNumber: (bookNumber) =>
      ipcRenderer.invoke('transactions:deleteBookByNumber', bookNumber),
    deleteFromTicket: (id) => ipcRenderer.invoke('transactions:deleteFromTicket', id),
    search: (query) => ipcRenderer.invoke('transactions:search', query),
    getOne: (id) => ipcRenderer.invoke('transaction:getOne', id), // legacy alias
    getLatestByKhda: (khdaName) => ipcRenderer.invoke('transactions:getLatestByKhda', khdaName),

    /* mark as synced */
    markSynced: (data) => ipcRenderer.invoke('transactions:markSynced', data),

    /* deleted buffer */
    getDeleted: () => ipcRenderer.invoke('transactions:getDeleted'),
    clearDeleted: (ids) => ipcRenderer.invoke('transactions:clearDeleted', ids),

    /* list all/active books for a khda (rich metadata) */
    getBooksByKhda: (khdaName) => ipcRenderer.invoke('transactions:getBooksByKhda', khdaName),

    registerActiveBook: (zoneName, khdaName, bookNumber) =>
      ipcRenderer.invoke('transactions:registerActiveBook', { zoneName, khdaName, bookNumber }),

    getActiveBookByZone: (zoneName, khdaName) =>
      ipcRenderer.invoke('transactions:getActiveBookByZone', { zoneName, khdaName })
  },
  akhrajat: {
    create: (data) => ipcRenderer.invoke('akhrajat:create', data),
    update: (data) => ipcRenderer.invoke('akhrajat:update', data),
    delete: (id) => ipcRenderer.invoke('akhrajat:delete', id),
    getAll: (...args) => ipcRenderer.invoke('akhrajat:getAll', ...args),
    gariSummary: (params) => ipcRenderer.invoke('akhrajat:gariSummary', params)
  },
  trollies: {
    update: (data) => ipcRenderer.invoke('trollies:update', data),
    getByTransactionId: (id) => ipcRenderer.invoke('trollies:getByTransactionId', id),
    getAll: (...args) => ipcRenderer.invoke('trollies:getAll', ...args)
  },
  test: {
    ping: () => ipcRenderer.invoke('test:ping')
  },
  sync: {
    transactions: () => ipcRenderer.invoke('sync:transactions')
  },
  admin: {
    zones: {
      getAll: () => ipcRenderer.invoke('zones:getAll'),
      create: (name) => ipcRenderer.invoke('zones:create', name),
      delete: (id) => ipcRenderer.invoke('zones:delete', id),
      update: (data) => ipcRenderer.invoke('zones:update', data)
    },
    othersTitles: {
      getAll: () => ipcRenderer.invoke('othersTitles:getAll'),
      create: (name) => ipcRenderer.invoke('othersTitles:create', name),
      update: (data) => ipcRenderer.invoke('othersTitles:update', data), // {id,name}
      delete: (id) => ipcRenderer.invoke('othersTitles:delete', id)
    },
    khdas: {
      getAllkhdas: () => ipcRenderer.invoke('khdas:getAllkhdas'),
      getAll: (zoneId) => ipcRenderer.invoke('khdas:getAll', zoneId),
      create: (data) => ipcRenderer.invoke('khdas:create', data),
      delete: (id) => ipcRenderer.invoke('khdas:delete', id),
      update: (data) => ipcRenderer.invoke('khdas:update', data)
    },
    akhrajatTitles: {
      getAll: () => ipcRenderer.invoke('akhrajatTitles:getAll'),
      create: (name) => ipcRenderer.invoke('akhrajatTitles:create', name),
      delete: (id) => ipcRenderer.invoke('akhrajatTitles:delete', id),
      update: (data) => ipcRenderer.invoke('akhrajatTitles:update', data)
    },

    gariTitles: {
      getAll: () => ipcRenderer.invoke('gariTitles:getAll'),
      create: (name) => ipcRenderer.invoke('gariTitles:create', name),
      delete: (id) => ipcRenderer.invoke('gariTitles:delete', id),
      update: (data) => ipcRenderer.invoke('gariTitles:update', data)
    },

    gariExpenseTypes: {
      getAll: () => ipcRenderer.invoke('gariExpenseTypes:getAll'),
      create: (name) => ipcRenderer.invoke('gariExpenseTypes:create', name),
      delete: (id) => ipcRenderer.invoke('gariExpenseTypes:delete', id),
      update: (data) => ipcRenderer.invoke('gariExpenseTypes:update', data)
    },

    gariParts: {
      getAll: () => ipcRenderer.invoke('gariParts:getAll'),
      create: (name) => ipcRenderer.invoke('gariParts:create', name),
      delete: (id) => ipcRenderer.invoke('gariParts:delete', id),
      update: (data) => ipcRenderer.invoke('gariParts:update', data)
    }
  },

  // Add IPC channel for app updates
  ipc: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('[Preload Error]', error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
