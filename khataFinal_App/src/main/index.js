import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Use the book icon from resources directory
const getIconPath = () => {
  let iconPath;
  if (is.dev) {
    // In development
    iconPath = join(process.cwd(), 'resources', 'notebook_address_book_book_icon_188753.ico')
  } else {
    // In production
    iconPath = join(process.resourcesPath, 'notebook_address_book_book_icon_188753.ico')
  }
  console.log('Using book icon path:', iconPath)
  return iconPath
}

// Set database path
const getDatabasePath = () => {
  let dbPath;
  if (is.dev) {
    dbPath = join(process.cwd(), 'prisma', 'data', 'finance.db')
  } else {
    dbPath = join(process.resourcesPath, 'prisma', 'data', 'finance.db')
  }
  console.log('Database path:', dbPath)
  return dbPath
}

const iconPath = getIconPath()
const dbPath = getDatabasePath()

// Set DATABASE_URL for Prisma
process.env.DATABASE_URL = `file:${dbPath}`

import { registerAuthHandlers } from './ipc/auth.js'
import transactionHandlers from './ipc/transaction.js'
import akhrajatHandlers from './ipc/akhrajat.js'
import trollyHandlers from './ipc/trolly.js'
import registerTestHandlers from './ipc/test.js'
import { registerAdminHandlers } from './ipc/admin.js'
import syncHandlers from './ipc/sync.js'
import { PrismaClient } from '@prisma/client'

// Initialize Prisma with the correct database URL
const prisma = new PrismaClient()

function createWindow() {
  // Create the browser window.
  console.log('Creating window with icon:', iconPath)
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (is.dev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' }) // or 'bottom' or 'right'
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()
  registerAuthHandlers(ipcMain)
  transactionHandlers(ipcMain)
  akhrajatHandlers(ipcMain)
  trollyHandlers(ipcMain)
  registerTestHandlers(ipcMain)
  syncHandlers(ipcMain)
  registerAdminHandlers(ipcMain)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
