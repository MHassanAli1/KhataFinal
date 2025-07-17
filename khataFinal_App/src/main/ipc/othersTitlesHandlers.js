// src/main/ipc/othersTitlesHandlers.js
import prisma from '../../../prisma/client.js'

/**
 * Optional Urdu validation. Uncomment if you want to restrict to Urdu only.
 * const isUrdu = (text) => /^[\u0600-\u06FF\s]+$/.test(text)
 */
const cleanName = (raw) => (raw ?? '').trim()

const othersTitlesHandlers = (ipcMain) => {
  /* -----------------------------------------------------------
   * GET ALL
   * --------------------------------------------------------- */
  ipcMain.handle('othersTitles:getAll', async () => {
    try {
      return await prisma.othersTitles.findMany({
        orderBy: { name: 'asc' }
      })
    } catch (err) {
      console.error('othersTitles:getAll error', err)
      throw new Error('متفرق عناوین لوڈ کرنے میں ناکامی۔')
    }
  })

  /* -----------------------------------------------------------
   * CREATE
   * arg: name (string)
   * --------------------------------------------------------- */
  ipcMain.handle('othersTitles:create', async (_event, name) => {
    try {
      const nm = cleanName(name)
      if (!nm) throw new Error('عنوان درکار ہے۔')
      // if (nm && !isUrdu(nm)) throw new Error('عنوان صرف اردو میں درج کریں۔')

      return await prisma.othersTitles.create({
        data: { name: nm }
      })
    } catch (err) {
      console.error('othersTitles:create error', err)
      // Unique violation (P2002)
      if (err?.code === 'P2002') {
        throw new Error('یہ عنوان پہلے سے موجود ہے۔')
      }
      throw new Error(err.message || 'متفرق عنوان بنانے میں ناکامی۔')
    }
  })

  /* -----------------------------------------------------------
   * UPDATE
   * arg: { id, name }
   * --------------------------------------------------------- */
  ipcMain.handle('othersTitles:update', async (_event, payload) => {
    try {
      const { id, name } = payload || {}
      const parsedId = parseInt(id)
      if (isNaN(parsedId)) throw new Error('غلط شناخت۔')

      const nm = cleanName(name)
      if (!nm) throw new Error('عنوان درکار ہے۔')
      // if (nm && !isUrdu(nm)) throw new Error('عنوان صرف اردو میں درج کریں۔')

      return await prisma.othersTitles.update({
        where: { id: parsedId },
        data: { name: nm }
      })
    } catch (err) {
      console.error('othersTitles:update error', err)
      if (err?.code === 'P2002') {
        throw new Error('یہ عنوان پہلے سے موجود ہے۔')
      }
      throw new Error(err.message || 'متفرق عنوان اپڈیٹ کرنے میں ناکامی۔')
    }
  })

  /* -----------------------------------------------------------
   * DELETE
   * arg: id
   * --------------------------------------------------------- */
  ipcMain.handle('othersTitles:delete', async (_event, id) => {
    try {
      const parsedId = parseInt(id)
      if (isNaN(parsedId)) throw new Error('غلط شناخت۔')

      // Optional: prevent delete if referenced by Akhrajat rows
      const refCount = await prisma.akhrajat.count({
        where: { othersTitlesId: parsedId }
      })
      if (refCount > 0) {
        throw new Error('یہ عنوان اخراجات میں استعمال ہو رہا ہے، حذف نہیں کیا جا سکتا۔')
      }

      return await prisma.othersTitles.delete({
        where: { id: parsedId }
      })
    } catch (err) {
      console.error('othersTitles:delete error', err)
      throw new Error(err.message || 'متفرق عنوان حذف کرنے میں ناکامی۔')
    }
  })
}

export default othersTitlesHandlers
