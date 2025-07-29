// src/main/ipc/transactionHandlers.js
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// اردو ویلیڈیشن
const isUrdu = (text) => /^[\u0600-\u06FF\s]+$/.test(text || '')

const MAX_TICKETS_PER_BOOK = 100

async function resolveOthersTitlesId(nameOrId) {
  // if numeric id passed directly
  if (typeof nameOrId === 'number' && !Number.isNaN(nameOrId)) {
    const found = await prisma.othersTitles.findUnique({ where: { id: nameOrId } })
    return found ? found.id : null
  }
  if (typeof nameOrId === 'string') {
    const nm = nameOrId.trim()
    if (!nm) return null
    // try find
    const found = await prisma.othersTitles.findUnique({ where: { name: nm } })
    if (found) return found.id
    // auto-create if not found
    const created = await prisma.othersTitles.create({ data: { name: nm } })
    return created.id
  }
  return null
}

const transactionHandlers = (ipcMain) => {
  /* ===================================================================
   * CREATE TRANSACTION
   * ================================================================= */
  ipcMain.handle('transactions:create', async (_event, data) => {
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
        EndingNum,
        bookNumber,
        totalTickets,
        akhrajat = []
      } = data ?? {}

      // Basic Validation
      if (!isUrdu(ZoneName) || !isUrdu(KhdaName)) {
        throw new Error('زون اور کھدہ کا نام صرف اردو میں ہونا چاہیے۔')
      }
      if (!EndingNum) throw new Error('اختتامی نمبر درج کریں۔')
      if (!bookNumber) throw new Error('کتاب نمبر درج کریں۔')
      if (!totalTickets || Number(totalTickets) <= 0) {
        throw new Error('کل ٹکٹ کی تعداد درست نہیں۔')
      }

      // Step 1: Find Active Book
      const activeBook = await prisma.activeBook.findFirst({
        where: {
          zoneName: ZoneName,
          khdaName: KhdaName,
          bookNumber,
          isActive: true
        }
      })

      if (!activeBook) {
        throw new Error(`کتاب نمبر ${bookNumber} اس زون اور کھدہ کے لیے فعال نہیں ہے۔`)
      }

      const used = activeBook.usedTickets
      const maxTickets = activeBook.maxTickets || 100
      const startTicket = (bookNumber - 1) * 100 + used + 1
      const endTicket = BigInt(startTicket) + BigInt(totalTickets) - 1n
      const maxTicketInBook = BigInt(bookNumber) * 100n

      if (used + Number(totalTickets) > maxTickets) {
        throw new Error(`کتاب نمبر ${bookNumber} میں صرف ${maxTickets - used} ٹکٹ باقی ہیں۔`)
      }

      if (BigInt(EndingNum) <= BigInt(startTicket)) {
        throw new Error('اختتامی نمبر، ابتدائی نمبر سے بڑا ہونا چاہیے۔')
      }

      if (BigInt(EndingNum) > maxTicketInBook) {
        throw new Error(`اختتامی نمبر کتاب کی حد ${maxTicketInBook} سے زیادہ نہیں ہو سکتا۔`)
      }

      // Step 2: Process Akhrajat Entries
      const dbTitles = await prisma.akhrajatTitle.findMany({ select: { name: true, isGari: true } })
      const titleMap = new Map(dbTitles.map((t) => [t.name, t.isGari]))
      const akhrajatCreateData = []

      for (const a of akhrajat) {
        if (!a?.title || a.amount == null || a.amount === '') continue
        if (!titleMap.has(a.title)) throw new Error(`غلط اخراجات کا عنوان: ${a.title}`)

        const isOther = a.isOther === true || a.title === 'متفرق'
        if (!isOther && a.description && !isUrdu(a.description)) {
          throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔')
        }

        const isGari = titleMap.get(a.title) === true
        const base = {
          title: a.title,
          description: isOther
            ? a.description && isUrdu(a.description)
              ? a.description
              : null
            : a.description || null,
          amount: BigInt(a.amount),
          date: date ? new Date(date) : new Date(),
          isGari,
          isOther
        }

        if (isOther) {
          const candidate = a.othersTitlesId ?? a.otherTitle ?? a.description
          const resolvedId = await resolveOthersTitlesId(candidate)
          if (!resolvedId) throw new Error('متفرق اخراجات کے ذیلی عنوان کا انتخاب ضروری ہے۔')
          akhrajatCreateData.push({
            ...base,
            othersTitles: { connect: { id: resolvedId } }
          })
          continue
        }

        if (isGari) {
          const items = Array.isArray(a.gariExpenses) ? a.gariExpenses : []
          if (items.length === 0)
            throw new Error(`گاڑی اخراجات کی تفصیل: ${a.title} کے لیے ضروری ہے۔`)

          const gariExpenseData = items.map((g) => {
            if (!g?.title) throw new Error('گاڑی کا خرچ درکار ہے')
            const t = g.title
            const qtyRaw = g.quantity
            const partRaw = g.part

            if (t === 'پٹرول' || t === 'ڈیزل') {
              const q = qtyRaw == null || qtyRaw === '' ? null : Number(qtyRaw)
              if (!q || Number.isNaN(q) || q <= 0)
                throw new Error(`${t} کے لیے درست مقدار درکار ہے`)
              return { title: t, quantity: q, part: null }
            }

            if (t === 'مرمت') {
              const p = (partRaw ?? '').toString().trim()
              if (!p) throw new Error('مرمت کے لیے پرزہ درکار ہے')
              return { title: t, quantity: null, part: p }
            }

            return {
              title: t,
              quantity: qtyRaw === '' || qtyRaw == null ? null : Number(qtyRaw),
              part: partRaw?.toString().trim() || null
            }
          })

          akhrajatCreateData.push({
            ...base,
            gariExpense: { create: gariExpenseData }
          })
          continue
        }

        akhrajatCreateData.push(base)
      }

      // Step 3: Create Transaction
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
          activeBookId: activeBook.id,
          trollies: {
            create: [
              {
                total: Number(totalTickets),
                StartingNum: BigInt(startTicket),
                EndingNum: endTicket,
                bookNumber: bookNumber,
                activeBookId: activeBook.id
              }
            ]
          },
          akhrajat: {
            create: akhrajatCreateData
          }
        },
        include: {
          trollies: true,
          akhrajat: { include: { gariExpense: true, othersTitles: true } }
        }
      })

      // Step 4: Update Active Book usage
      const updatedUsed = used + Number(totalTickets)
      await prisma.activeBook.update({
        where: { id: activeBook.id },
        data: {
          usedTickets: updatedUsed,
          isActive: updatedUsed >= maxTickets ? false : true
        }
      })

      console.log(`✅ معاملہ کامیابی سے بنایا گیا، بک نمبر: ${bookNumber}`)
      return transaction
    } catch (err) {
      console.error(`❌ معاملہ بنانے میں ناکامی: ${err.message}`)
      throw new Error(err.message || 'معاملہ بنانے میں ناکامی')
    }
  })

  /* ===================================================================
   * GET ALL
   * ================================================================= */
  ipcMain.handle('transactions:getAll', async () => {
    try {
      return await prisma.transaction.findMany({
        include: {
          trollies: true,
          akhrajat: { include: { gariExpense: true } }
        }
      })
    } catch (err) {
      console.error('Get All Error:', err)
      throw new Error('Failed to fetch transactions')
    }
  })

  /* ===================================================================
   * GET BY ID
   * ================================================================= */
  ipcMain.handle('transactions:getById', async (_event, id) => {
    const txId = parseInt(id, 10)
    if (isNaN(txId)) throw new Error('Invalid transaction ID')

    return prisma.transaction.findUnique({
      where: { id: txId },
      include: {
        trollies: true,
        akhrajat: { include: { gariExpense: true } }
      }
    })
  })

  /* ===================================================================
   * UPDATE
   *  (bookNumber NOT re-counting tickets; does minimal safety check)
   * ================================================================= */
  ipcMain.handle('transactions:update', async (_event, { id, ...data }) => {
    try {
      const parsedId = parseInt(id, 10)
      if (isNaN(parsedId)) throw new Error('غلط شناخت')

      const { ZoneName, KhdaName, date, bookNumber } = data

      if (ZoneName && !isUrdu(ZoneName)) {
        throw new Error('زون کا نام صرف اردو میں ہونا چاہیے۔')
      }
      if (KhdaName && !isUrdu(KhdaName)) {
        throw new Error('کھدہ کا نام صرف اردو میں ہونا چاہیے۔')
      }

      let bookNumberToSet
      if (bookNumber) {
        // Ensure book reserved for same khda
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
          // reserve it now
          await prisma.usedBookNumber.create({
            data: { number: bookNumber, khdaName: existingTransaction.KhdaName }
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
          // ticketNumber deliberately unchanged
        }
      })

      console.log(`✅ ٹرانزیکشن اپڈیٹ ہو گیا (ID: ${id})`)
      return updated
    } catch (err) {
      console.error(`❌ ٹرانزیکشن اپڈیٹ ناکام: ${err.message}`)
      throw new Error(err.message || 'اپڈیٹ ناکام')
    }
  })

  /* ===================================================================
   * DELETE (single)
   * ================================================================= */
  ipcMain.handle('transactions:delete', async (_event, id) => {
    try {
      const parsedId = parseInt(id, 10)
      if (isNaN(parsedId)) throw new Error('Invalid ID')

      const transaction = await prisma.transaction.findUnique({
        where: { id: parsedId }
      })
      if (!transaction) throw new Error('Transaction not found')

      await prisma.deletedTransaction.create({
        data: { transactionId: parsedId }
      })

      await prisma.akhrajat.deleteMany({ where: { transactionId: parsedId } })
      await prisma.trolly.deleteMany({ where: { transactionId: parsedId } })
      await prisma.transaction.delete({ where: { id: parsedId } })

      return { message: `ٹرانزیکشن حذف کر دیا گیا۔` }
    } catch (err) {
      console.error('Delete Error:', err)
      throw new Error(err.message || 'Failed to delete transaction')
    }
  })

  /* ===================================================================
   * DELETE ALL BY BOOK NUMBER
   * ================================================================= */
  ipcMain.handle('transactions:deleteBookByNumber', async (_event, bookNumber) => {
    try {
      const transactions = await prisma.transaction.findMany({ where: { bookNumber } })
      const idsToDelete = transactions.map((t) => t.id)

      for (const tid of idsToDelete) {
        await prisma.deletedTransaction.create({ data: { transactionId: tid } })
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

  /* ===================================================================
   * DELETE FROM TICKET (cascade forward)
   * ================================================================= */
  ipcMain.handle('transactions:deleteFromTicket', async (_event, id) => {
    try {
      const parsedId = parseInt(id, 10)
      if (isNaN(parsedId)) throw new Error('Invalid ID')

      const transaction = await prisma.transaction.findUnique({ where: { id: parsedId } })
      if (!transaction) throw new Error('Transaction not found')

      const { bookNumber, ticketNumber } = transaction

      const toDelete = await prisma.transaction.findMany({
        where: { bookNumber, ticketNumber: { gte: ticketNumber } }
      })
      const idsToDelete = toDelete.map((t) => t.id)

      for (const tid of idsToDelete) {
        await prisma.deletedTransaction.create({ data: { transactionId: tid } })
      }

      await prisma.akhrajat.deleteMany({ where: { transactionId: { in: idsToDelete } } })
      await prisma.trolly.deleteMany({ where: { transactionId: { in: idsToDelete } } })
      await prisma.transaction.deleteMany({ where: { id: { in: idsToDelete } } })

      return { message: `ٹکٹ نمبر ${ticketNumber} سے تمام حذف کر دیے گئے۔` }
    } catch (err) {
      console.error('Delete From Ticket Error:', err)
      throw new Error('Failed to delete from ticket')
    }
  })

  /* ===================================================================
   * SEARCH
   * ================================================================= */
  ipcMain.handle('transactions:search', async (_event, query) => {
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
          akhrajat: { include: { gariExpense: true } }
        }
      })
    } catch (err) {
      console.error('Search Error:', err)
      throw new Error('Failed to search transactions')
    }
  })

  /* ===================================================================
   * LEGACY GET ONE
   * ================================================================= */
  ipcMain.handle('transaction:getOne', async (_event, id) => {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          trollies: true,
          akhrajat: { include: { gariExpense: true } }
        }
      })
      return transaction
    } catch (err) {
      console.error('Fetch Transaction Error:', err)
      throw new Error('ٹرانزیکشن حاصل نہیں ہو سکی')
    }
  })

  /* ===================================================================
   * GET ALL BOOKS FOR A KHDA
   *  - returns registered books + usage
   *  - includes legacy books found in transactions but not registered
   * ================================================================= */
  ipcMain.handle('transactions:getBooksByKhda', async (_event, khdaName) => {
    try {
      if (!khdaName) return []

      // Registered books
      const registered = await prisma.usedBookNumber.findMany({
        where: { khdaName: khdaName },
        select: { number: true }
      })

      // Usage counts from transactions
      const grouped = await prisma.transaction.groupBy({
        by: ['bookNumber'],
        where: { KhdaName: khdaName },
        _count: { _all: true },
        _max: { createdAt: true }
      })

      const countMap = new Map()
      grouped.forEach((g) => {
        countMap.set(g.bookNumber, {
          ticketsUsed: g._count._all,
          lastTxDate: g._max.createdAt
        })
      })

      const books = []

      // include all registered
      for (const r of registered) {
        const info = countMap.get(r.number)
        const used = info?.ticketsUsed ?? 0
        books.push({
          bookNumber: r.number,
          ticketsUsed: used,
          ticketsRemaining: Math.max(0, MAX_TICKETS_PER_BOOK - used),
          nextTicket: used >= MAX_TICKETS_PER_BOOK ? MAX_TICKETS_PER_BOOK : used + 1,
          isFull: used >= MAX_TICKETS_PER_BOOK,
          lastTxDate: info?.lastTxDate ?? null
        })
      }

      // include any *unregistered* legacy bookNumbers that have transactions
      for (const [num, info] of countMap.entries()) {
        if (!books.some((b) => b.bookNumber === num)) {
          const used = info.ticketsUsed
          books.push({
            bookNumber: num,
            ticketsUsed: used,
            ticketsRemaining: Math.max(0, MAX_TICKETS_PER_BOOK - used),
            nextTicket: used >= MAX_TICKETS_PER_BOOK ? MAX_TICKETS_PER_BOOK : used + 1,
            isFull: used >= MAX_TICKETS_PER_BOOK,
            lastTxDate: info.lastTxDate ?? null
          })
        }
      }

      // sort: non-full first, then latest use desc, then numeric/alpha
      books.sort((a, b) => {
        if (a.isFull !== b.isFull) return a.isFull ? 1 : -1
        if (a.lastTxDate && b.lastTxDate) {
          const da = new Date(a.lastTxDate).getTime()
          const db = new Date(b.lastTxDate).getTime()
          if (da !== db) return db - da
        }
        return a.bookNumber.localeCompare(b.bookNumber, undefined, { numeric: true })
      })

      return books
    } catch (err) {
      console.error('transactions:getBooksByKhda Error:', err)
      throw new Error('کتابوں کی فہرست لوڈ کرنے میں ناکامی')
    }
  })

  /* ===================================================================
   * LATEST ACTIVE BOOK (legacy helper, 1 book)
   * Returns: last used ticketNumber (renderer adds +1)
   * ================================================================= */
  ipcMain.handle('transactions:getLatestByKhda', async (_event, khdaName) => {
    try {
      if (!khdaName) return null

      const latest = await prisma.transaction.findFirst({
        where: { KhdaName: khdaName },
        orderBy: { createdAt: 'desc' },
        select: { bookNumber: true, ticketNumber: true }
      })

      if (!latest) return null
      if (latest.ticketNumber >= MAX_TICKETS_PER_BOOK) return null

      // Return last ticket used; renderer will add +1
      return latest
    } catch (err) {
      console.error('transactions:getLatestByKhda Error:', err)
      throw new Error('کھدہ کے لیے فعال کتاب حاصل کرنے میں ناکامی')
    }
  })

  /* ===================================================================
   * SYNC MARK
   * ================================================================= */
  ipcMain.handle('transactions:markSynced', async (_event, { id, syncedAt }) => {
    return await prisma.transaction.update({
      where: { id },
      data: {
        Synced: true,
        SyncedAt: new Date(syncedAt)
      }
    })
  })

  /* ===================================================================
   * DELETED BUFFER
   * ================================================================= */
  ipcMain.handle('transactions:getDeleted', async () => {
    return await prisma.deletedTransaction.findMany()
  })

  ipcMain.handle('transactions:clearDeleted', async (_event, ids) => {
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
  // 🔐 Register (or re-activate) an active book
  ipcMain.handle(
    'transactions:registerActiveBook',
    async (_event, { zoneName, khdaName, bookNumber }) => {
      if (!zoneName || !khdaName || !bookNumber) {
        throw new Error('زون، کھدہ اور کتاب نمبر درکار ہیں۔')
      }

      // look for an *active* book with same zone + bookNumber
      const existing = await prisma.activeBook.findFirst({
        where: {
          zoneName,
          bookNumber,
          isActive: true
        }
      })

      if (existing) {
        if (existing.khdaName !== khdaName) {
          throw new Error(
            `کتاب نمبر ${bookNumber} زون ${zoneName} میں پہلے سے ${existing.khdaName} کے لیے ایکٹو ہے۔`
          )
        }
        // already active for this khda
        return existing
      }

      // otherwise create a fresh activeBook
      const newActive = await prisma.activeBook.create({
        data: {
          zoneName,
          khdaName,
          bookNumber,
          usedTickets: 0,
          isActive: true
        }
      })

      return newActive
    }
  )

  // 🔍 List all *active* (not full) books for a zone+khda
  ipcMain.handle('transactions:getActiveBookByZone', async (_event, { zoneName, khdaName }) => {
    if (!zoneName || !khdaName) return []

    return prisma.activeBook.findMany({
      where: {
        zoneName,
        khdaName,
        isActive: true,
        usedTickets: { lt: 100 }
      },
      select: {
        id: true,
        bookNumber: true,
        usedTickets: true
      },
      orderBy: { bookNumber: 'asc' }
    })
  })
}

export default transactionHandlers
