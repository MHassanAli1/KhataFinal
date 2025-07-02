
const registerTestHandlers = (ipcMain) => {
  ipcMain.handle('test:ping', async () => {
    return 'pong from main process'
  })
}

export default registerTestHandlers
