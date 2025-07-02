import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import Store from 'electron-store'

const store = new Store()
let currentUser = store.get('user') || null

export function registerAuthHandlers(ipcMain) {
  ipcMain.handle('auth:register', async (event, { name, email, password }) => {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new Error('Email already in use')

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashed }
    })

    currentUser = { id: user.id, name: user.name, email: user.email }
    store.set('user', currentUser)
    return currentUser
  })

  ipcMain.handle('auth:login', async (event, { email, password }) => {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw new Error('User does not exist')

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('Invalid password')

    currentUser = { id: user.id, name: user.name, email: user.email }
    store.set('user', currentUser)
    return currentUser
  })

  ipcMain.handle('auth:getSession', async () => {
    if (!currentUser) return null

    const user = await prisma.user.findUnique({ where: { id: currentUser.id } })
    if (!user) {
      currentUser = null
      store.delete('user')
      return null
    }

    return currentUser
  })

  ipcMain.handle('auth:logout', () => {
    currentUser = null
    store.delete('user')
    return true
  })
}
