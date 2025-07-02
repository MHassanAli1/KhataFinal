// src/main/ipc/akhrajatHandlers.js

import prisma from '../../../prisma/client.js'

const isUrdu = (text) => /^[\u0600-\u06FF\s]+$/.test(text)

const akhrajatHandlers = (ipcMain) => {
  ipcMain.handle('akhrajat:create', async (event, data) => {
    try {
      const { title, description, amount, transactionId, date } = data

      if (!title || !transactionId || !amount) {
        throw new Error('عنوان، لین دین کی شناخت، یا رقم غائب ہے۔')
      }

      // validate title from AkhrajatTitle list
      const validTitles = await prisma.akhrajatTitle.findMany()
      const validTitleNames = validTitles.map((t) => t.name)

      if (!validTitleNames.includes(title)) {
        throw new Error('غلط اخراجات کا عنوان منتخب کیا گیا ہے۔')
      }

      if (description && !isUrdu(description)) {
        throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔')
      }

      const newEntry = await prisma.akhrajat.create({
        data: {
          title,
          description,
          amount: BigInt(amount),
          date: new Date(
            (
              await prisma.transaction.findUnique({
                where: { id: parseInt(transactionId) }
              })
            )?.date
          ),
          transaction: { connect: { id: parseInt(transactionId) } }
        }
      })
      await prisma.transaction.update({
        where: { id: parseInt(transactionId) },
        data: {} // will bump updatedAt
      })

      return newEntry
    } catch (err) {
      console.error('Akhrajat Create Error:', err)
      throw new Error(err.message || 'اخراجات شامل کرنے میں ناکامی')
    }
  })

  ipcMain.handle('akhrajat:update', async (event, data) => {
    try {
      const { id, title, description, amount, date } = data
      const parsedId = parseInt(id)

      if (isNaN(parsedId)) throw new Error('Invalid Akhrajat ID')

      // validate title if provided
      if (title) {
        const validTitles = await prisma.akhrajatTitle.findMany()
        const validTitleNames = validTitles.map((t) => t.name)

        if (!validTitleNames.includes(title)) {
          throw new Error('غلط اخراجات کا عنوان منتخب کیا گیا ہے۔')
        }
      }

      if (description && !isUrdu(description)) {
        throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔')
      }

      const updated = await prisma.akhrajat.update({
        where: { id: parsedId },
        data: {
          title,
          description,
          amount: amount ? BigInt(amount) : undefined,
          date: date ? new Date(date) : undefined
        }
      })
      const parentTx = await prisma.akhrajat.findUnique({
        where: { id: parsedId }
      })
      if (parentTx) {
        await prisma.transaction.update({
          where: { id: parentTx.transactionId },
          data: {}
        })
      }

      return updated
    } catch (err) {
      console.error('Akhrajat Update Error:', err)
      throw new Error(err.message || 'اخراجات کی تفصیل اپڈیٹ نہیں ہو سکی۔')
    }
  })

  ipcMain.handle('akhrajat:delete', async (event, id) => {
    try {
      const parsedId = parseInt(id)
      if (isNaN(parsedId)) throw new Error('Invalid Akhrajat ID')

      const deleted = await prisma.akhrajat.delete({
        where: { id: parsedId }
      })
      if (deleted?.transactionId) {
        await prisma.transaction.update({
          where: { id: deleted.transactionId },
          data: {}
        })
      }

      return deleted
    } catch (err) {
      console.error('Akhrajat Delete Error:', err)
      throw new Error(err.message || 'اخراجات حذف کرنے میں ناکامی')
    }
  })

  ipcMain.handle('akhrajat:getAll', async () => {
    try {
      const all = await prisma.akhrajat.findMany({
        include: {
          transaction: true // include transaction for zone/khda info
        }
      })
      return all
    } catch (err) {
      console.error('Akhrajat GetAll Error:', err)
      throw new Error('اخراجات ڈیٹا لوڈ کرنے میں ناکامی')
    }
  })
}

export default akhrajatHandlers
