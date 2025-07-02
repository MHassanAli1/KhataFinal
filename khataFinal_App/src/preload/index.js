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
    deleteBookByNumber: (bookNumber) => ipcRenderer.invoke('transactions:deleteBookByNumber', bookNumber),
    deleteFromTicket: (id) => ipcRenderer.invoke('transactions:deleteFromTicket', id),
    search: (query) => ipcRenderer.invoke('transactions:search', query),
    getOne: (id) => ipcRenderer.invoke('transaction:getOne', id),
    getLatestByKhda: (khdaName) => ipcRenderer.invoke('transactions:getLatestByKhda', khdaName)
  },
  akhrajat: {
    create: (data) => ipcRenderer.invoke('akhrajat:create', data),
    update: (data) => ipcRenderer.invoke('akhrajat:update', data),
    delete: (id) => ipcRenderer.invoke('akhrajat:delete', id),
    getAll: (...args) => ipcRenderer.invoke('akhrajat:getAll', ...args)
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
    }
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
