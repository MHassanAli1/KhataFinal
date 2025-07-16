import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// اردو ویلیڈیشن
const isUrdu = (text) => /^[\u0600-\u06FF\s]+$/.test(text)

const transactionHandlers = (ipcMain) => {
  ipcMain.handle('transactions:create', async (event, data) => {
    try {
      const {
        userID,
        ZoneName,
        KhdaName,
        KulAmdan,
        date,
        KulAkhrajat,
        KulMaizan,
        SaafiAmdan,
        Exercise,
        StartingNum,
        EndingNum,
        total,
        bookNumber,
        akhrajat = []
      } = data

      if (!isUrdu(ZoneName) || !isUrdu(KhdaName)) {
        throw new Error('زون اور کھدہ کا نام صرف اردو میں ہونا چاہیے۔')
      }

      if (!StartingNum || !EndingNum || !total) {
        throw new Error('ٹرالی کے نمبرز اور کل ٹرالیاں لازمی ہیں۔')
      }

      if (!bookNumber) {
        throw new Error('کتاب نمبر درج کریں۔')
      }

      // چیک کریں یہ بک نمبر کسی اور کھدہ کے ساتھ تو نہیں لگا
      const usedBook = await prisma.usedBookNumber.findUnique({
        where: { number: bookNumber }
      })

      if (usedBook) {
        if (usedBook.khdaName !== KhdaName) {
          throw new Error(
            `کتاب نمبر ${bookNumber} پہلے سے ${usedBook.khdaName} کے لیے استعمال ہو چکا ہے۔`
          )
        }
      } else {
        // نہیں استعمال ہوا، تو محفوظ کریں
        await prisma.usedBookNumber.create({
          data: {
            number: bookNumber,
            khdaName: KhdaName
          }
        })
      }

      // موجودہ ٹکٹ کی گنتی
      const ticketCount = await prisma.transaction.count({
        where: {
          bookNumber,
          KhdaName
        }
      })

      if (ticketCount >= 100) {
        throw new Error(
          `کتاب نمبر ${bookNumber} پر 100 ٹکٹ مکمل ہو چکے ہیں۔ نیا کتاب نمبر درج کریں۔`
        )
      }

      const ticketNumber = ticketCount + 1

      const validTitles = await prisma.akhrajatTitle.findMany()
      const validTitleNames = validTitles.map((t) => t.name)

      const transaction = await prisma.transaction.create({
        data: {
          userID,
          ZoneName,
          KhdaName,
          KulAmdan: BigInt(KulAmdan),
          KulAkhrajat: BigInt(KulAkhrajat),
          KulMaizan: BigInt(KulMaizan),
          SaafiAmdan: BigInt(SaafiAmdan),
          Exercise: BigInt(Exercise),
          date: date ? new Date(date) : new Date(),
          bookNumber,
          ticketNumber,
          trollies: {
            create: [
              {
                total: Number(total),
                StartingNum: BigInt(StartingNum),
                EndingNum: BigInt(EndingNum)
              }
            ]
          },
          akhrajat: {
            create: await Promise.all(
              akhrajat
                .filter((a) => a.title && a.amount !== undefined && a.amount !== null)
                .map(async (a) => {
                  if (!validTitleNames.includes(a.title)) {
                    throw new Error(`غلط اخراجات کا عنوان: ${a.title}`)
                  }

                  if (a.description && !isUrdu(a.description)) {
                    throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔')
                  }

                  const base = {
                    title: a.title,
                    description: a.description || null,
                    amount: BigInt(a.amount),
                    date: date ? new Date(date) : new Date(),
                    isGari: a.isGari || false,
                    isOther: a.isOther || false
                  }

                  if (a.isGari) {
                    const gariExpenseData = (a.gariExpenses || []).map((g) => {
                      if (!g.title) throw new Error('گاڑی کا خرچ درکار ہے')

                      const title = g.title
                      const quantity = g.quantity !== '' ? Number(g.quantity) : null
                      const part = g.part?.trim() || null

                      if (
                        ['پٹرول', 'ڈیزل'].includes(title) &&
                        (quantity === null || isNaN(quantity))
                      ) {
                        throw new Error(`${title} کے لیے درست مقدار درکار ہے`)
                      }

                      if (title === 'مرمت' && !part) {
                        throw new Error('مرمت کے لیے پرزہ درکار ہے')
                      }

                      return {
                        title,
                        quantity,
                        part
                      }
                    })

                    return {
                      ...base,
                      gariExpense: {
                        create: gariExpenseData
                      }
                    }
                  }

                  return base
                })
            )
          }
        },
        include: {
          trollies: true,
          akhrajat: {
            include: {
              gariExpense: true
            }
          }
        }
      })

      console.log(
        `✅ معاملہ کامیابی سے بنایا گیا، بک نمبر: ${bookNumber}, ٹکٹ نمبر: ${ticketNumber}`
      )

      return transaction
    } catch (err) {
      console.error(`❌ معاملہ بنانے میں ناکامی: ${err.message}`)
      throw new Error(err.message || 'معاملہ بنانے میں ناکامی')
    }
  })

  ipcMain.handle('transactions:getLastEndingNumber', async () => {
    const lastTrolly = await prisma.trolly.findFirst({
      orderBy: { EndingNum: 'desc' }
    })
    return lastTrolly?.EndingNum || 0n
  })

  ipcMain.handle('transactions:getAll', async () => {
    try {
      return await prisma.transaction.findMany({
        include: {
          trollies: true,
          akhrajat: {
            include: {
              gariExpense: true
            }
          }
        }
      })
    } catch (err) {
      console.error('Get All Error:', err)
      throw new Error('Failed to fetch transactions')
    }
  })

  // src/main/ipc/transactionHandlers.js (example – adjust your actual filename)
  ipcMain.handle('transactions:getById', async (event, id) => {
    const txId = parseInt(id, 10)
    if (isNaN(txId)) throw new Error('Invalid transaction ID')

    return prisma.transaction.findUnique({
      where: { id: txId },
      include: {
        trollies: true,
        akhrajat: {
          include: {
            gariExpense: true // <-- CRITICAL
          }
        }
      }
    })
  })

  ipcMain.handle('transactions:update', async (event, { id, ...data }) => {
    try {
      const parsedId = parseInt(id)
      if (isNaN(parsedId)) throw new Error('غلط شناخت')

      const { ZoneName, KhdaName, date, bookNumber } = data

      // validate Urdu
      if (ZoneName && !isUrdu(ZoneName)) {
        throw new Error('زون کا نام صرف اردو میں ہونا چاہیے۔')
      }

      if (KhdaName && !isUrdu(KhdaName)) {
        throw new Error('کھدہ کا نام صرف اردو میں ہونا چاہیے۔')
      }

      // optional bookNumber update
      let bookNumberToSet
      if (bookNumber) {
        // check if this bookNumber is valid for the same khda
        const usedBook = await prisma.usedBookNumber.findUnique({
          where: { number: bookNumber }
        })

        const existingTransaction = await prisma.transaction.findUnique({
          where: { id: parsedId }
        })

        if (!existingTransaction) {
          throw new Error('ٹرانزیکشن نہیں ملا۔')
        }

        if (usedBook) {
          if (usedBook.khdaName !== existingTransaction.KhdaName) {
            throw new Error(
              `کتاب نمبر ${bookNumber} پہلے سے ${usedBook.khdaName} کے لیے استعمال ہو چکا ہے۔`
            )
          }
        } else {
          // first time use, register this book
          await prisma.usedBookNumber.create({
            data: {
              number: bookNumber,
              khdaName: existingTransaction.KhdaName
            }
          })
        }

        bookNumberToSet = bookNumber
      }

      const updated = await prisma.transaction.update({
        where: { id: parsedId },
        data: {
          ZoneName,
          KhdaName,
          KulAmdan: data.KulAmdan ? BigInt(data.KulAmdan) : undefined,
          KulAkhrajat: data.KulAkhrajat ? BigInt(data.KulAkhrajat) : undefined,
          KulMaizan: data.KulMaizan ? BigInt(data.KulMaizan) : undefined,
          SaafiAmdan: data.SaafiAmdan ? BigInt(data.SaafiAmdan) : undefined,
          Exercise: data.Exercise ? BigInt(data.Exercise) : undefined,
          date: date ? new Date(date) : undefined,
          bookNumber: bookNumberToSet
          // ticketNumber deliberately never changed
        }
      })

      console.log(`✅ ٹرانزیکشن اپڈیٹ ہو گیا (ID: ${id})`)
      return updated
    } catch (err) {
      console.error(`❌ ٹرانزیکشن اپڈیٹ ناکام: ${err.message}`)
      throw new Error(err.message || 'اپڈیٹ ناکام')
    }
  })

  ipcMain.handle('transactions:delete', async (event, id) => {
    try {
      const parsedId = parseInt(id)
      if (isNaN(parsedId)) throw new Error('Invalid ID')

      const transaction = await prisma.transaction.findUnique({
        where: { id: parsedId }
      })
      if (!transaction) throw new Error('Transaction not found')

      // ➡️ store in DeletedTransaction
      await prisma.deletedTransaction.create({
        data: {
          transactionId: parsedId
        }
      })

      // continue deleting as before
      await prisma.akhrajat.deleteMany({ where: { transactionId: parsedId } })
      await prisma.trolly.deleteMany({ where: { transactionId: parsedId } })
      await prisma.transaction.delete({ where: { id: parsedId } })

      return { message: `ٹرانزیکشن حذف کر دیا گیا۔` }
    } catch (err) {
      console.error('Delete Error:', err)
      throw new Error(err.message || 'Failed to delete transaction')
    }
  })

  ipcMain.handle('transactions:deleteBookByNumber', async (event, bookNumber) => {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { bookNumber }
      })
      const idsToDelete = transactions.map((t) => t.id)

      // store in DeletedTransaction
      for (const tid of idsToDelete) {
        await prisma.deletedTransaction.create({
          data: { transactionId: tid }
        })
      }

      await prisma.akhrajat.deleteMany({ where: { transactionId: { in: idsToDelete } } })
      await prisma.trolly.deleteMany({ where: { transactionId: { in: idsToDelete } } })
      await prisma.transaction.deleteMany({ where: { id: { in: idsToDelete } } })
      await prisma.usedBookNumber.deleteMany({ where: { number: bookNumber } })

      return { message: `پوری کتاب نمبر ${bookNumber} حذف کر دی گئی۔` }
    } catch (err) {
      console.error('Delete Book Error:', err)
      throw new Error(err.message || 'Failed to delete book')
    }
  })

  ipcMain.handle('transactions:deleteFromTicket', async (event, id) => {
    try {
      const parsedId = parseInt(id)
      if (isNaN(parsedId)) throw new Error('Invalid ID')

      const transaction = await prisma.transaction.findUnique({ where: { id: parsedId } })
      if (!transaction) throw new Error('Transaction not found')

      const { bookNumber, ticketNumber } = transaction

      const toDelete = await prisma.transaction.findMany({
        where: {
          bookNumber,
          ticketNumber: { gte: ticketNumber }
        }
      })
      const idsToDelete = toDelete.map((t) => t.id)

      // store in DeletedTransaction
      for (const tid of idsToDelete) {
        await prisma.deletedTransaction.create({
          data: { transactionId: tid }
        })
      }

      await prisma.akhrajat.deleteMany({ where: { transactionId: { in: idsToDelete } } })
      await prisma.trolly.deleteMany({ where: { transactionId: { in: idsToDelete } } })
      await prisma.transaction.deleteMany({ where: { id: { in: idsToDelete } } })

      return { message: `ٹکٹ نمبر ${ticketNumber} سے تمام حذف کر دیے گئے۔` }
    } catch (err) {
      console.error('Delete From Ticket Error:', err)
      throw new Error(err.message || 'Failed to delete from ticket')
    }
  })

  ipcMain.handle('transactions:search', async (event, query) => {
    try {
      if (!query || typeof query !== 'string') throw new Error('Invalid search input')

      return await prisma.transaction.findMany({
        where: {
          OR: [
            { ZoneName: { contains: query, mode: 'insensitive' } },
            { KhdaName: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          trollies: true,
          akhrajat: {
            include: {
              gariExpense: true
            }
          }
        }
      })
    } catch (err) {
      console.error('Search Error:', err)
      throw new Error('Failed to search transactions')
    }
  })

  ipcMain.handle('transaction:getOne', async (event, id) => {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          trollies: true,
          akhrajat: {
            include: {
              gariExpense: true
            }
          }
        }
      })
      return transaction
    } catch (err) {
      console.error('Fetch Transaction Error:', err)
      throw new Error('ٹرانزیکشن حاصل نہیں ہو سکی')
    }
  })

  ipcMain.handle('transactions:getLatestByKhda', async (event, khdaName) => {
    try {
      // get the latest transaction for this khda
      const latest = await prisma.transaction.findFirst({
        where: { KhdaName: khdaName },
        orderBy: { createdAt: 'desc' },
        select: {
          bookNumber: true,
          ticketNumber: true
        }
      })

      if (!latest || !latest.bookNumber) {
        // no transaction yet
        return null
      }

      if (latest.ticketNumber < 100) {
        // current book still has tickets available
        return {
          bookNumber: latest.bookNumber,
          ticketNumber: latest.ticketNumber
        }
      } else {
        // book is full
        return null
      }
    } catch (err) {
      console.error('getActiveBookByKhda Error:', err)
      throw new Error('کھدہ کے لیے فعال کتاب حاصل کرنے میں ناکامی')
    }
  })

  ipcMain.handle('transactions:markSynced', async (event, { id, syncedAt }) => {
    return await prisma.transaction.update({
      where: { id },
      data: {
        Synced: true,
        SyncedAt: new Date(syncedAt)
      }
    })
  })
  ipcMain.handle('transactions:getDeleted', async () => {
    return await prisma.deletedTransaction.findMany()
  })
  ipcMain.handle('transactions:clearDeleted', async (event, ids) => {
    try {
      await prisma.deletedTransaction.deleteMany({
        where: { transactionId: { in: ids } }
      })
      return { message: 'DeletedTransaction cleared.' }
    } catch (err) {
      console.error('Clear Deleted Error:', err)
      throw new Error('Failed to clear deleted transactions')
    }
  })
}

export default transactionHandlers
