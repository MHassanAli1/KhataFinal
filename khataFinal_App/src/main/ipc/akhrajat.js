// src/main/ipc/akhrajatHandlers.js
import prisma from '../../../prisma/client.js'

/* ================================================================
 * Constants
 * ============================================================== */

/**
 * Label in AkhrajatTitle that represents the "Other / Mutafarik"
 * umbrella category. Must match DB row exactly.
 * Change if your DB uses a different spelling (e.g., 'متفرق', 'متفرقات', etc.).
 */
const MUTAFARIK_LABEL = 'متفرق'

/* ================================================================
 * Helpers
 * ============================================================== */

/** Basic Urdu-only check (spaces allowed). */
const isUrdu = (text = '') => /^[\u0600-\u06FF\s]+$/.test(text)

/** BigInt → Number (best effort) for reporting/aggregation. */
const bi2n = (v) => {
  if (v == null) return 0
  if (typeof v === 'bigint') {
    const asNum = Number(v)
    return Number.isFinite(asNum) ? asNum : Number(v.toString())
  }
  return Number(v)
}

/** Map Urdu/English spellings to normalized slug values used in validation logic. */
const toSlug = (raw = '') => {
  const v = String(raw || '').trim().toLowerCase()
  if (!v) return ''
  if (['petrol', 'پٹرول'].includes(v)) return 'petrol'
  if (['diesel', 'ڈیزل'].includes(v)) return 'diesel'
  if (['repairing', 'مرمت'].includes(v)) return 'repairing'
  if (['tuning', 'ٹیوننگ', 'ٹوننگ'].includes(v)) return 'tuning'
  return v
}

/** Safely coerce to BigInt (allows string or number). */
const toBig = (val) => {
  if (val === null || val === undefined || val === '') return undefined
  if (typeof val === 'bigint') return val
  const n = typeof val === 'number' ? val : parseInt(val, 10)
  if (Number.isNaN(n)) return undefined
  return BigInt(n)
}

/** Ensure we always work with an *array* of gari expense objects. */
const coerceGariArray = (maybe) => {
  if (!maybe) return []
  if (Array.isArray(maybe)) return maybe
  return [maybe] // single object fallback
}

/** Normalize data coming from frontend (gariExpenses vs gariExpense). */
const extractFrontendGari = (data) => {
  // Prefer gariExpenses array; else gariExpense; else []
  const raw = data?.gariExpenses ?? data?.gariExpense ?? []
  return coerceGariArray(raw)
}

/** Validate gari expense rows (after slug normalization). */
const validateGariExpenses = (gariExpenses) => {
  for (const exp of gariExpenses) {
    if (!exp?.title) throw new Error('گاڑی خرچ کی قسم درکار ہے۔')
    const type = toSlug(exp.title)

    if (['petrol', 'diesel'].includes(type)) {
      if (!exp.quantity || Number(exp.quantity) <= 0) {
        throw new Error('پٹرول یا ڈیزل کیلئے مقدار درکار ہے۔')
      }
    }

    if (type === 'repairing') {
      if (!exp.part || !String(exp.part).trim()) {
        throw new Error('مرمت کے لیے پرزہ کا نام درکار ہے۔')
      }
    }
  }
}

/**
 * Resolve OthersTitles row:
 *  - If numeric ID provided, validate it exists.
 *  - Else look up by name; if missing, create it.
 * NOTE: We *do not* enforce Urdu-only here; change as needed.
 */
const resolveOthersTitlesId = async (nameOrId) => {
  if (nameOrId == null) return null

  // numeric?
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

/* ================================================================
 * Main IPC Handlers
 * ============================================================== */
const akhrajatHandlers = (ipcMain) => {
  /* -------------------------------------------------------------
   * CREATE
   *  data: {
   *    title, description, amount, transactionId,
   *    isGari (optional), isOther (optional),
   *    othersTitlesId (optional), otherTitle (optional string),
   *    gariExpenses: [{title,quantity,part}, ...] (optional)
   *  }
   * ----------------------------------------------------------- */
  ipcMain.handle('akhrajat:create', async (_event, data) => {
    try {
      const {
        title,
        description,
        amount,
        transactionId,
        isGari: isGariFromClient,
        isOther: isOtherFromClient,
        othersTitlesId,
        otherTitle // name fallback
      } = data ?? {}

      if (!title || !transactionId || amount === undefined || amount === null) {
        throw new Error('عنوان، لین دین کی شناخت، یا رقم غائب ہے۔')
      }

      const txId = parseInt(transactionId, 10)
      if (Number.isNaN(txId)) throw new Error('غلط لین دین شناخت۔')

      // Validate AkhrajatTitle (exists in admin table)
      const titleRow = await prisma.akhrajatTitle.findUnique({
        where: { name: title }
      })
      if (!titleRow) {
        throw new Error('غلط اخراجات کا عنوان منتخب کیا گیا ہے۔')
      }

      // Determine flags (server-authoritative)
      const isGari = !!titleRow.isGari
      const isOther = isOtherFromClient === true || title === MUTAFARIK_LABEL

      // Description validation:
      // - If non-other: require Urdu (if provided)
      // - If other: allow free text, but if you WANT Urdu, wrap in isUrdu().
      if (!isOther && description && !isUrdu(description)) {
        throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔')
      }

      // Get parent transaction date (fallback to now)
      const tx = await prisma.transaction.findUnique({
        where: { id: txId },
        select: { date: true }
      })
      const txDate = tx?.date ? new Date(tx.date) : new Date()

      // Normalize gari array from frontend
      const gariExpenses = extractFrontendGari(data)
      if (isGari && gariExpenses.length > 0) {
        validateGariExpenses(gariExpenses)
      }

      // Build base create
      const baseData = {
        title,
        description: description ?? null,
        amount: toBig(amount) ?? BigInt(0),
        date: txDate,
        isGari,
        isOther,
        transaction: { connect: { id: txId } }
      }

      // Attach OthersTitles relation if Mutafarik
      let otherConnect
      if (isOther) {
        // Use explicit id > otherTitle name > description fallback
        const candidate = othersTitlesId ?? otherTitle ?? description
        const resolvedId = await resolveOthersTitlesId(candidate)
        if (!resolvedId) {
          throw new Error('متفرق اخراجات کے ذیلی عنوان کا انتخاب ضروری ہے۔')
        }
        otherConnect = { connect: { id: resolvedId } }
      }

      // Build full create payload
      const createPayload = {
        ...baseData,
        ...(otherConnect ? { othersTitles: otherConnect } : {}),
        ...(isGari && gariExpenses.length > 0
          ? {
              gariExpense: {
                create: gariExpenses.map((g) => ({
                  title: g.title,
                  quantity:
                    ['petrol', 'diesel'].includes(toSlug(g.title)) && g.quantity !== undefined
                      ? Number(g.quantity)
                      : null,
                  part: toSlug(g.title) === 'repairing' ? g.part || null : null
                }))
              }
            }
          : {})
      }

      const newAkhrajat = await prisma.akhrajat.create({
        data: createPayload,
        include: { gariExpense: true, othersTitles: true }
      })

      // bump parent transaction updatedAt (touch)
      await prisma.transaction.update({
        where: { id: txId },
        data: {} // updatedAt auto-updates
      })

      return newAkhrajat
    } catch (err) {
      console.error('Akhrajat Create Error:', err)
      throw new Error(err.message || 'اخراجات شامل کرنے میں ناکامی')
    }
  })

  /* -------------------------------------------------------------
   * UPDATE
   *  data: {
   *    id, title?, description?, amount?, date?, isGari?, isOther?,
   *    othersTitlesId?, otherTitle?, gariExpenses?
   *  }
   * ----------------------------------------------------------- */
  ipcMain.handle('akhrajat:update', async (_event, data) => {
    try {
      const {
        id,
        title,
        description,
        amount,
        date,
        isGari: isGariFromClient,
        isOther: isOtherFromClient,
        othersTitlesId,
        otherTitle
      } = data ?? {}

      const parsedId = parseInt(id, 10)
      if (Number.isNaN(parsedId)) throw new Error('Invalid Akhrajat ID')

      // Fetch existing row to anchor decisions
      const existing = await prisma.akhrajat.findUnique({
        where: { id: parsedId },
        include: { transaction: true, othersTitles: true }
      })
      if (!existing) throw new Error('اخراجات ریکارڈ نہیں ملا۔')

      // Validate title if provided (must exist in admin table)
      let titleRow = null
      if (title) {
        titleRow = await prisma.akhrajatTitle.findUnique({ where: { name: title } })
        if (!titleRow) {
          throw new Error('غلط اخراجات کا عنوان منتخب کیا گیا ہے۔')
        }
      }

      // Determine authoritative new flags
      const effectiveTitle = title ?? existing.title
      const effectiveTitleRow =
        titleRow ??
        (await prisma.akhrajatTitle.findUnique({
          where: { name: existing.title }
        }))
      const isGari = effectiveTitleRow?.isGari ?? existing.isGari ?? false
      const isOther = isOtherFromClient === true || effectiveTitle === MUTAFARIK_LABEL

      // Description validation (non-other only)
      if (!isOther && description && !isUrdu(description)) {
        throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔')
      }

      // Normalize gari array
      const gariExpenses = extractFrontendGari(data)
      if (isGari && gariExpenses.length > 0) {
        validateGariExpenses(gariExpenses)
      }

      // Build update data
      const updateData = {
        title,
        description: description ?? undefined,
        amount: amount !== undefined ? toBig(amount) : undefined,
        date: date ? new Date(date) : undefined,
        isGari,
        isOther
      }

      // OthersTitles relation update
      if (isOther) {
        const candidate = othersTitlesId ?? otherTitle ?? description ?? existing.othersTitles?.name
        const resolvedId = await resolveOthersTitlesId(candidate)
        if (!resolvedId) {
          throw new Error('متفرق اخراجات کے ذیلی عنوان کا انتخاب ضروری ہے۔')
        }
        updateData.othersTitles = { connect: { id: resolvedId } }
      } else {
        // clear relation if switching away from Mutafarik
        updateData.othersTitles = { disconnect: true }
      }

      // Build tx steps:
      const txOps = [
        prisma.akhrajat.update({
          where: { id: parsedId },
          data: updateData
        }),
        // Always wipe old gariExpense rows (even if not gari now)
        prisma.gariExpense.deleteMany({ where: { akhrajatId: parsedId } })
      ]

      // Recreate gariExpense if still gari + data provided
      if (isGari && gariExpenses.length > 0) {
        txOps.push(
          prisma.gariExpense.createMany({
            data: gariExpenses.map((g) => ({
              akhrajatId: parsedId,
              title: g.title,
              quantity:
                ['petrol', 'diesel'].includes(toSlug(g.title)) && g.quantity !== undefined
                  ? Number(g.quantity)
                  : null,
              part: toSlug(g.title) === 'repairing' ? g.part || null : null
            }))
          })
        )
      }

      await prisma.$transaction(txOps)

      // Re-fetch full record with relation
      const refreshed = await prisma.akhrajat.findUnique({
        where: { id: parsedId },
        include: { gariExpense: true, transaction: true, othersTitles: true }
      })

      // bump parent transaction updatedAt
      if (refreshed?.transactionId) {
        await prisma.transaction.update({
          where: { id: refreshed.transactionId },
          data: {}
        })
      }

      return refreshed
    } catch (err) {
      console.error('Akhrajat Update Error:', err)
      throw new Error(err.message || 'اخراجات کی تفصیل اپڈیٹ نہیں ہو سکی۔')
    }
  })

  /* -------------------------------------------------------------
   * DELETE
   * ----------------------------------------------------------- */
  ipcMain.handle('akhrajat:delete', async (_event, id) => {
    try {
      const parsedId = parseInt(id, 10)
      if (Number.isNaN(parsedId)) throw new Error('Invalid Akhrajat ID')

      // Delete + fetch deleted row so we can bump parent
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

  /* -------------------------------------------------------------
   * GET ALL
   * ----------------------------------------------------------- */
  ipcMain.handle('akhrajat:getAll', async () => {
    try {
      const all = await prisma.akhrajat.findMany({
        include: {
          transaction: true,
          gariExpense: true,
          othersTitles: true
        }
      })
      return all
    } catch (err) {
      console.error('Akhrajat GetAll Error:', err)
      throw new Error('اخراجات ڈیٹا لوڈ کرنے میں ناکامی')
    }
  })

  /* -------------------------------------------------------------
   * GARI SUMMARY
   *  params: {
   *    gariTitle (required),
   *    zoneName?, khdaName?, bookNumber?, dateFrom?, dateTo?
   *  }
   * ----------------------------------------------------------- */
  ipcMain.handle('akhrajat:gariSummary', async (_event, params) => {
    const { gariTitle, zoneName, khdaName, bookNumber, dateFrom, dateTo } = params || {}

    if (!gariTitle) {
      throw new Error('گاڑی کا نام درکار ہے۔')
    }

    // Build date filter
    const dateFilter =
      dateFrom || dateTo
        ? {
            gte: dateFrom ? new Date(dateFrom) : undefined,
            lte: dateTo ? new Date(dateTo) : undefined
          }
        : undefined

    // Build transaction relational filter
    const txFilter = {}
    if (zoneName) txFilter.ZoneName = zoneName
    if (khdaName) txFilter.KhdaName = khdaName
    if (bookNumber) txFilter.bookNumber = bookNumber

    const where = {
      isGari: true,
      title: gariTitle, // exact match; works with SQLite
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(Object.keys(txFilter).length ? { transaction: { is: txFilter } } : {})
    }

    const rows = await prisma.akhrajat.findMany({
      where,
      include: {
        transaction: {
          select: {
            id: true,
            date: true,
            ZoneName: true,
            KhdaName: true,
            bookNumber: true,
            ticketNumber: true
          }
        },
        gariExpense: true,
        othersTitles: true // harmless; usually null here
      },
      orderBy: {
        transaction: { date: 'asc' }
      }
    })

    /* ---------------- Aggregate ---------------- */
    const totals = { amount: 0, count: 0 }
    const byType = {}
    const repairParts = {}

    for (const row of rows) {
      const amt = bi2n(row.amount)
      totals.amount += amt
      totals.count += 1

      const gx = row.gariExpense?.[0]
      const gxTitle = gx?.title || 'دیگر'
      const gxQty = gx?.quantity ?? null
      const gxPart = gx?.part ?? null

      if (!byType[gxTitle]) {
        byType[gxTitle] = {
          amount: 0,
          totalQuantity: 0,
          count: 0,
          entries: []
        }
      }
      const bucket = byType[gxTitle]
      bucket.amount += amt
      bucket.count += 1
      if (gxQty != null) bucket.totalQuantity += Number(gxQty)

      bucket.entries.push({
        date: row.transaction?.date?.toISOString?.() ?? row.transaction?.date ?? row.date,
        amount: amt,
        quantity: gxQty,
        part: gxPart,
        transactionId: row.transaction?.id,
        zone: row.transaction?.ZoneName,
        khda: row.transaction?.KhdaName,
        bookNumber: row.transaction?.bookNumber,
        ticketNumber: row.transaction?.ticketNumber
      })

      if (gxTitle === 'مرمت') {
        const p = gxPart || 'نامعلوم پرزہ'
        if (!repairParts[p]) {
          repairParts[p] = {
            amount: 0,
            count: 0,
            entries: []
          }
        }
        const partBucket = repairParts[p]
        partBucket.amount += amt
        partBucket.count += 1
        partBucket.entries.push({
          date: row.transaction?.date?.toISOString?.() ?? row.transaction?.date ?? row.date,
          amount: amt,
          transactionId: row.transaction?.id,
          zone: row.transaction?.ZoneName,
          khda: row.transaction?.KhdaName,
          bookNumber: row.transaction?.bookNumber,
          ticketNumber: row.transaction?.ticketNumber
        })
      }
    }

    return {
      gariTitle,
      filters: { zoneName, khdaName, bookNumber, dateFrom, dateTo },
      totals,
      byType,
      repairParts,
      rawCount: rows.length
    }
  })
}

export default akhrajatHandlers
