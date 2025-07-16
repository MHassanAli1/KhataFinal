import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Urdu validation helper
const isUrdu = (text) => /^[\u0600-\u06FF\s]+$/.test(text)

export const registerAdminHandlers = (ipcMain) => {
  // ----------------------------
  // Zones
  // ----------------------------
  ipcMain.handle('zones:getAll', async () => {
    return await prisma.zone.findMany({
      include: { khdas: true }
    })
  })

  ipcMain.handle('zones:create', async (event, name) => {
    try {
      if (!isUrdu(name)) {
        throw new Error('زون کا نام صرف اردو میں ہونا چاہیے۔')
      }
      return await prisma.zone.create({
        data: { name }
      })
    } catch (err) {
      console.error('Zone Create Error:', err)
      throw new Error(err.message || 'زون محفوظ کرنے میں ناکامی')
    }
  })

  ipcMain.handle('zones:delete', async (event, id) => {
    return await prisma.zone.delete({
      where: { id: Number(id) }
    })
  })

  ipcMain.handle('zones:update', async (event, { id, name }) => {
    try {
      if (name && !isUrdu(name)) {
        throw new Error('زون کا نام صرف اردو میں ہونا چاہیے۔')
      }
      return await prisma.zone.update({
        where: { id: Number(id) },
        data: { name }
      })
    } catch (err) {
      console.error('Zone Update Error:', err)
      throw new Error(err.message || 'زون اپڈیٹ کرنے میں ناکامی')
    }
  })

  // ----------------------------
  // Khdas
  // ----------------------------
  ipcMain.handle('khdas:getAll', async (event, zoneId) => {
    if (!zoneId || isNaN(Number(zoneId))) {
      console.error('❌ zoneId is invalid or missing')
      throw new Error('Invalid zoneId for khdas:getAll')
    }
    return await prisma.khda.findMany({
      where: { zoneId: Number(zoneId) }
    })
  })

  ipcMain.handle('khdas:getAllkhdas', async () => {
    return await prisma.khda.findMany({
      include: { zone: true }
    })
  })

  ipcMain.handle('khdas:create', async (event, { name, zoneId }) => {
    try {
      if (!isUrdu(name)) {
        throw new Error('کھدہ کا نام صرف اردو میں ہونا چاہیے۔')
      }
      return await prisma.khda.create({
        data: {
          name,
          zoneId: Number(zoneId)
        }
      })
    } catch (err) {
      console.error('Khda Create Error:', err)
      throw new Error(err.message || 'کھدہ محفوظ کرنے میں ناکامی')
    }
  })

  ipcMain.handle('khdas:delete', async (event, id) => {
    return await prisma.khda.delete({
      where: { id: Number(id) }
    })
  })

  ipcMain.handle('khdas:update', async (event, { id, name, zoneId }) => {
    try {
      if (name && !isUrdu(name)) {
        throw new Error('کھدہ کا نام صرف اردو میں ہونا چاہیے۔')
      }
      return await prisma.khda.update({
        where: { id: Number(id) },
        data: {
          name,
          zoneId: Number(zoneId)
        }
      })
    } catch (err) {
      console.error('Khda Update Error:', err)
      throw new Error(err.message || 'کھدہ اپڈیٹ کرنے میں ناکامی')
    }
  })

  // ----------------------------
  // Akhrajat Titles
  // ----------------------------
  ipcMain.handle('akhrajatTitles:getAll', async () => {
    return await prisma.akhrajatTitle.findMany()
  })

  ipcMain.handle('akhrajatTitles:create', async (event, name) => {
    return await prisma.akhrajatTitle.create({
      data: { name }
    })
  })

  ipcMain.handle('akhrajatTitles:delete', async (event, id) => {
    return await prisma.akhrajatTitle.delete({
      where: { id: Number(id) }
    })
  })

  ipcMain.handle('akhrajatTitles:update', async (event, { id, name }) => {
    return await prisma.akhrajatTitle.update({
      where: { id: Number(id) },
      data: { name }
    })
  })

  // ----------------------------
  // Gari Titles
  // ----------------------------
  ipcMain.handle('gariTitles:getAll', async () => {
    return await prisma.gariTitle.findMany()
  })

  ipcMain.handle('gariTitles:create', async (event, name) => {
    const newGari = await prisma.gariTitle.create({
      data: { name }
    })

    await prisma.akhrajatTitle.create({
      data: { name, isGari: true }
    })

    return newGari
  })

  // Update gariTitles:update to also update AkhrajatTitle
  ipcMain.handle('gariTitles:update', async (event, { id, name }) => {
    const updated = await prisma.gariTitle.update({
      where: { id: Number(id) },
      data: { name }
    })

    await prisma.akhrajatTitle.updateMany({
      where: { name: updated.name, isGari: true },
      data: { name }
    })

    return updated
  })

  // Update gariTitles:delete to also delete from AkhrajatTitle
  ipcMain.handle('gariTitles:delete', async (event, id) => {
    const deleted = await prisma.gariTitle.delete({
      where: { id: Number(id) }
    })

    await prisma.akhrajatTitle.deleteMany({
      where: {
        name: deleted.name,
        isGari: true
      }
    })

    return deleted
  })

  // ----------------------------
  // Gari Expense Type Titles
  // ----------------------------
  ipcMain.handle('gariExpenseTypes:getAll', async () => {
    return await prisma.gariExpenseTypeTitle.findMany()
  })

  ipcMain.handle('gariExpenseTypes:create', async (event, name) => {
    return await prisma.gariExpenseTypeTitle.create({
      data: { name }
    })
  })

  ipcMain.handle('gariExpenseTypes:update', async (event, { id, name }) => {
    return await prisma.gariExpenseTypeTitle.update({
      where: { id: Number(id) },
      data: { name }
    })
  })

  ipcMain.handle('gariExpenseTypes:delete', async (event, id) => {
    return await prisma.gariExpenseTypeTitle.delete({
      where: { id: Number(id) }
    })
  })

  // ----------------------------
  // Gari Parts
  // ----------------------------
  ipcMain.handle('gariParts:getAll', async () => {
    return await prisma.gariParts.findMany()
  })

  ipcMain.handle('gariParts:create', async (event, name) => {
    return await prisma.gariParts.create({
      data: { name }
    })
  })

  ipcMain.handle('gariParts:update', async (event, { id, name }) => {
    return await prisma.gariParts.update({
      where: { id: Number(id) },
      data: { name }
    })
  })

  ipcMain.handle('gariParts:delete', async (event, id) => {
    return await prisma.gariParts.delete({
      where: { id: Number(id) }
    })
  })
}
