import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// اردو ویلیڈیشن
const isUrdu = (text) => /^[\u0600-\u06FF\s]+$/.test(text || '')

const MAX_TICKETS_PER_BOOK = 100

async function resolveOthersTitlesId(nameOrId) {
  if (typeof nameOrId === 'number' && !Number.isNaN(nameOrId)) {
    const found = await prisma.othersTitles.findUnique({ where: { id: nameOrId } })
    return found ? found.id : null
  }
  if (typeof nameOrId === 'string') {
    const nm = nameOrId.trim()
    if (!nm) return null
    const found = await prisma.othersTitles.findUnique({ where: { name: nm } })
    if (found) return found.id
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

      if (!isUrdu(ZoneName) || !isUrdu(KhdaName)) {
        throw new Error('زون اور کھدہ کا نام صرف اردو میں ہونا چاہیے۔')
      }
      if (!EndingNum) throw new Error('اختتامی نمبر درج کریں۔')
      if (!bookNumber) throw new Error('کتاب نمبر درج کریں۔')
      if (!totalTickets || Number(totalTickets) <= 0) {
        throw new Error('کل ٹکٹ کی تعداد درست نہیں۔')
      }

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

      await prisma.activeBook.update({
        where: { id: activeBook.id },
        data: {
          usedTickets: used + Number(totalTickets),
          isActive: used + Number(totalTickets) >= maxTickets ? false : true
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
  ipcMain.handle('transactions:getAll', async (_event, filters = {}) => {
    try {
      const { zoneName, khdaName, bookNumber, dateFrom, dateTo } = filters

      const where = {
        ...(zoneName ? { ZoneName: { contains: zoneName, mode: 'insensitive' } } : {}),
        ...(khdaName ? { KhdaName: { contains: khdaName, mode: 'insensitive' } } : {}),
        ...(bookNumber
          ? {
              trollies: {
                some: { bookNumber: Number(bookNumber) }
              }
            }
          : {}),
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {})
              }
            }
          : {})
      }

      return await prisma.transaction.findMany({
        where,
        include: {
          trollies: true,
          akhrajat: { include: { gariExpense: true } },
          activeBook: true
        },
        orderBy: { date: 'desc' }
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
        akhrajat: { include: { gariExpense: true } },
        activeBook: true
      }
    })
  })

  /* ===================================================================
   * UPDATE
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
  ipcMain.handle('transactions:delete', async (_event, txIdArg) => {
    const txId = parseInt(txIdArg, 10)
    if (isNaN(txId)) throw new Error('Invalid transaction ID')

    const tx = await prisma.transaction.findUnique({
      where: { id: txId },
      include: { trollies: { take: 1 }, activeBook: true }
    })
    if (!tx) throw new Error('Transaction not found')

    const trolly = tx.trollies[0]
    const ab = tx.activeBook
    if (!trolly || !ab) throw new Error('Malformed data')

    const allT = await prisma.trolly.findMany({ where: { bookNumber: trolly.bookNumber } })
    const toRemove = allT.filter((t) => t.StartingNum >= trolly.StartingNum)
    const removeCount = toRemove.length

    if (!ab.isActive || ab.usedTickets >= MAX_TICKETS_PER_BOOK) {
      const allTx = await prisma.transaction.findMany({ where: { activeBookId: ab.id } })
      const allIds = allTx.map((t) => t.id)

      await prisma.deletedTransaction.createMany({
        data: allIds.map((id) => ({ transactionId: id }))
      })
      await prisma.akhrajat.deleteMany({ where: { transactionId: { in: allIds } } })
      await prisma.trolly.deleteMany({ where: { activeBookId: ab.id } })
      await prisma.transaction.deleteMany({ where: { activeBookId: ab.id } })
      await prisma.activeBook.delete({ where: { id: ab.id } })

      return { message: `کتاب نمبر ${trolly.bookNumber} پوری طرح حذف کر دی گئی۔` }
    }

    const txnsToDel = await prisma.transaction.findMany({
      where: { trollies: { some: { id: { in: toRemove.map((t) => t.id) } } } }
    })
    const txIds = txnsToDel.map((t) => t.id)

    await prisma.deletedTransaction.createMany({
      data: txIds.map((id) => ({ transactionId: id }))
    })
    await prisma.akhrajat.deleteMany({ where: { transactionId: { in: txIds } } })
    await prisma.trolly.deleteMany({ where: { id: { in: toRemove.map((t) => t.id) } } })
    await prisma.transaction.deleteMany({ where: { id: { in: txIds } } })

    await prisma.activeBook.update({
      where: { id: ab.id },
      data: { usedTickets: ab.usedTickets - removeCount }
    })

    const highest = allT[allT.length - 1].EndingNum
    return { message: `ٹرالی ${trolly.StartingNum} سے ${highest} تک حذف کر دی گئیں۔` }
  })

  /* ===================================================================
   * DELETE FROM TROLLEY (cascade forward)
   * ================================================================= */
  ipcMain.handle('transactions:deleteFromTrolly', async (_event, trollyIdArg) => {
    const trollyId = parseInt(trollyIdArg, 10)
    if (isNaN(trollyId)) throw new Error('Invalid trolley ID')

    const startT = await prisma.trolly.findUnique({ where: { id: trollyId } })
    if (!startT) throw new Error('Trolley not found')

    const all = await prisma.trolly.findMany({ where: { bookNumber: startT.bookNumber } })
    const toRemove = all.filter((t) => t.StartingNum >= startT.StartingNum)
    if (!toRemove.length) throw new Error('کوئی ٹرالی حذف کرنے کے لیے نہیں ملی۔')

    const ab = await prisma.activeBook.findFirst({ where: { bookNumber: startT.bookNumber } })
    if (!ab) throw new Error('ActiveBook not found')

    const txIds = toRemove.map((t) => t.transactionId)
    await prisma.deletedTransaction.createMany({
      data: txIds.map((id) => ({ transactionId: id }))
    })
    await prisma.akhrajat.deleteMany({ where: { transactionId: { in: txIds } } })
    await prisma.trolly.deleteMany({ where: { id: { in: toRemove.map((t) => t.id) } } })
    await prisma.transaction.deleteMany({ where: { id: { in: txIds } } })

    await prisma.activeBook.update({
      where: { id: ab.id },
      data: { usedTickets: ab.usedTickets - toRemove.length }
    })

    return { message: `ٹرالی نمبر ${startT.StartingNum} سے آگے کی تمام ٹرالیاں حذف کر دی گئیں۔` }
  })

  /* ===================================================================
   * DELETE ALL BY BOOK NUMBER
   * ================================================================= */
  ipcMain.handle('transactions:deleteBookByNumber', async (_event, bookNumber) => {
    try {
      const bookNum = parseInt(bookNumber, 10)
      if (isNaN(bookNum)) throw new Error('غلط کتاب نمبر')

      const activeBook = await prisma.activeBook.findFirst({
        where: { bookNumber: bookNum },
        include: { zone: true, khda: true }
      })
      if (!activeBook) throw new Error(`کتاب نمبر ${bookNum} نہیں ملی`)

      return await prisma.$transaction(async (prisma) => {
        const trollies = await prisma.trolly.findMany({
          where: { bookNumber: bookNum },
          include: { transaction: true }
        })
        const transactionIds = trollies.map((t) => t.transactionId)

        await prisma.deletedTransaction.createMany({
          data: transactionIds.map((txId) => ({ transactionId: txId }))
        })

        await prisma.akhrajat.deleteMany({ where: { transactionId: { in: transactionIds } } })
        await prisma.trolly.deleteMany({ where: { bookNumber: bookNum } })
        await prisma.transaction.deleteMany({ where: { id: { in: transactionIds } } })

        await prisma.activeBook.delete({ where: { id: activeBook.id } })

        return { message: `کتاب نمبر ${bookNum} پوری طرح حذف کر دی گئی۔` }
      })
    } catch (err) {
      console.error('Delete Book Error:', err)
      throw new Error(err.message || 'کتاب حذف کرنے میں ناکامی')
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
            { KhdaName: { contains: query, mode: 'insensitive' } },
            { trollies: { some: { bookNumber: Number(query) } } }
          ]
        },
        include: {
          trollies: true,
          akhrajat: { include: { gariExpense: true } },
          activeBook: true
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
          akhrajat: { include: { gariExpense: true } },
          activeBook: true
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
   * ================================================================= */
  ipcMain.handle('transactions:getBooksByKhda', async (_event, khdaName) => {
    try {
      if (!khdaName) return []

      const registered = await prisma.usedBookNumber.findMany({
        where: { khdaName },
        select: { number: true }
      })

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
   * LATEST ACTIVE BOOK
   * ================================================================= */
  ipcMain.handle('transactions:getLatestByKhda', async (_event, khdaName) => {
    try {
      if (!khdaName) return null

      const latest = await prisma.transaction.findFirst({
        where: { KhdaName: khdaName },
        orderBy: { createdAt: 'desc' },
        include: { trollies: { select: { bookNumber: true } } }
      })

      if (!latest) return null
      if (latest.trollies[0]?.bookNumber >= MAX_TICKETS_PER_BOOK) return null

      return { bookNumber: latest.trollies[0]?.bookNumber }
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

  /* ===================================================================
   * REGISTER ACTIVE BOOK
   * ================================================================= */
  ipcMain.handle(
    'transactions:registerActiveBook',
    async (_event, { zoneName, khdaName, bookNumber }) => {
      if (!zoneName || !khdaName || !bookNumber) {
        throw new Error('زون، کھدہ اور کتاب نمبر درکار ہیں۔')
      }

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
        return existing
      }

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

  /* ===================================================================
   * LIST ACTIVE BOOKS
   * ================================================================= */
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

  /* ===================================================================
   * DELETE A SINGLE TROLLEY
   * ================================================================= */
  ipcMain.handle('transactions:deleteTrolly', async (_event, trollyId) => {
    try {
      const tid = parseInt(trollyId, 10)
      if (isNaN(tid)) throw new Error('غلط ٹرالی آئی ڈی')

      const trolly = await prisma.trolly.findUnique({
        where: { id: tid },
        include: {
          transaction: {
            include: { activeBook: true }
          }
        }
      })
      if (!trolly) throw new Error('ٹرالی نہیں ملی')

      const { bookNumber, StartingNum, total, transactionId } = trolly
      const { activeBook } = trolly.transaction
      if (!activeBook) throw new Error('منسلک ایکٹو کتاب نہیں ملی')

      const allTrollies = await prisma.trolly.findMany({
        where: { bookNumber },
        orderBy: { StartingNum: 'asc' }
      })
      if (!allTrollies.length) throw new Error('اس کتاب کے لیے کوئی ٹرالیاں نہیں')

      const highestEnding = allTrollies[allTrollies.length - 1].EndingNum

      return await prisma.$transaction(async (prisma) => {
        if (!activeBook.isActive || activeBook.usedTickets >= MAX_TICKETS_PER_BOOK) {
          const txns = await prisma.transaction.findMany({
            where: { activeBookId: activeBook.id }
          })
          const txIds = txns.map((t) => t.id)

          await prisma.deletedTransaction.createMany({
            data: txIds.map((txId) => ({ transactionId: txId }))
          })

          await prisma.akhrajat.deleteMany({ where: { transactionId: { in: txIds } } })
          await prisma.trolly.deleteMany({ where: { activeBookId: activeBook.id } })
          await prisma.transaction.deleteMany({ where: { activeBookId: activeBook.id } })

          await prisma.activeBook.update({
            where: { id: activeBook.id },
            data: { usedTickets: 0, isActive: false }
          })

          return { message: `کتاب نمبر ${bookNumber} پوری طرح حذف کر دی گئی۔` }
        }

        const toDeleteTrollyIds = allTrollies
          .filter((tr) => tr.StartingNum >= StartingNum)
          .map((tr) => tr.id)

        const totalTickets = allTrollies
          .filter((tr) => tr.StartingNum >= StartingNum)
          .reduce((sum, tr) => sum + tr.total, 0)

        const toDeleteTxns = await prisma.transaction.findMany({
          where: {
            trollies: {
              some: { id: { in: toDeleteTrollyIds } }
            }
          }
        })
        const toDeleteTxnIds = toDeleteTxns.map((t) => t.id)

        await prisma.deletedTransaction.createMany({
          data: toDeleteTxnIds.map((txId) => ({ transactionId: txId }))
        })

        await prisma.akhrajat.deleteMany({ where: { transactionId: { in: toDeleteTxnIds } } })
        await prisma.trolly.deleteMany({ where: { id: { in: toDeleteTrollyIds } } })
        await prisma.transaction.deleteMany({ where: { id: { in: toDeleteTxnIds } } })

        await prisma.activeBook.update({
          where: { id: activeBook.id },
          data: {
            usedTickets: {
              decrement: Math.min(totalTickets, activeBook.usedTickets)
            }
          }
        })

        return {
          message: `ٹرالی ${StartingNum} سے ${highestEnding} تک حذف کر دی گئیں۔`
        }
      })
    } catch (err) {
      console.error('Delete Trolley Error:', err)
      throw new Error(err.message || 'ٹرالی حذف کرنے میں ناکامی')
    }
  })
  ipcMain.handle('transactions:deleteActiveBook', async (_event, bookId) => {
    try {
      // Check if the book has any trollies
      const trolleyCount = await prisma.trolly.count({
        where: { activeBookId: Number(bookId) }
      })
      if (trolleyCount > 0) {
        throw new Error('Cannot delete active book with associated trollies')
      }
      await prisma.activeBook.delete({
        where: { id: Number(bookId) }
      })
      return { message: 'Active book deleted successfully' }
    } catch (err) {
      console.error('Delete Active Book Error:', err)
      throw new Error(`Failed to delete active book: ${err.message}`)
    }
  })
}

export default transactionHandlers
