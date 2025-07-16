// src/main/ipc/akhrajatHandlers.js

import prisma from '../../../prisma/client.js'

/* -------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------- */

/** Basic Urdu-only check (kept from your original). */
const isUrdu = (text) => /^[\u0600-\u06FF\\s]+$/.test(text)

/** Map Urdu/English spellings to slug values used in validation logic. */
const toSlug = (raw = '') => {
  const v = (raw || '').trim().toLowerCase()
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
  // if already BigInt
  if (typeof val === 'bigint') return val
  // number or string
  const n = typeof val === 'number' ? val : parseInt(val, 10)
  if (isNaN(n)) return undefined
  return BigInt(n)
}

/** Ensure we always work with an *array* of gari expense objects. */
const coerceGariArray = (maybe) => {
  if (!maybe) return []
  if (Array.isArray(maybe)) return maybe
  // single object fallback
  return [maybe]
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

/** Normalize data coming from frontend (gariExpenses vs gariExpense). */
const extractFrontendGari = (data) => {
  // Prefer gariExpenses array; else gariExpense; else []
  const raw =
    data?.gariExpenses ??
    data?.gariExpense ??
    [] // fallback
  return coerceGariArray(raw)
}

/* -------------------------------------------------------------
 * Main IPC Handlers
 * ----------------------------------------------------------- */

const akhrajatHandlers = (ipcMain) => {
  /* ----------------------------- CREATE ----------------------------- */
  ipcMain.handle('akhrajat:create', async (event, data) => {
    try {
      const { title, description, amount, transactionId, isGari } = data

      if (!title || !transactionId || amount === undefined || amount === null) {
        throw new Error('عنوان، لین دین کی شناخت، یا رقم غائب ہے۔')
      }

      // Validate AkhrajatTitle
      const validTitles = await prisma.akhrajatTitle.findMany()
      const validTitleNames = validTitles.map((t) => t.name)
      if (!validTitleNames.includes(title)) {
        throw new Error('غلط اخراجات کا عنوان منتخب کیا گیا ہے۔')
      }

      // Optional Urdu-only desc rule
      if (description && !isUrdu(description)) {
        throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔')
      }

      // Get parent transaction date (fallback to now if missing)
      const tx = await prisma.transaction.findUnique({
        where: { id: parseInt(transactionId) }
      })
      const txDate = tx?.date ? new Date(tx.date) : new Date()

      // Normalize gari array from frontend
      const gariExpenses = extractFrontendGari(data)

      if (isGari && gariExpenses.length > 0) {
        validateGariExpenses(gariExpenses)
      }

      // Create Akhrajat (nested create for gariExpense)
      const newAkhrajat = await prisma.akhrajat.create({
        data: {
          title,
          description,
          amount: toBig(amount) ?? BigInt(0),
          date: txDate,
          isGari: !!isGari,
          transaction: { connect: { id: parseInt(transactionId) } },
          gariExpense:
            isGari && gariExpenses.length > 0
              ? {
                  create: gariExpenses.map((g) => ({
                    title: g.title,
                    quantity:
                      ['petrol', 'diesel'].includes(toSlug(g.title)) && g.quantity !== undefined
                        ? Number(g.quantity)
                        : null,
                    part: toSlug(g.title) === 'repairing' ? g.part || null : null
                  }))
                }
              : undefined
        },
        include: { gariExpense: true }
      })

      // bump parent transaction updatedAt
      await prisma.transaction.update({
        where: { id: parseInt(transactionId) },
        data: {}
      })

      return newAkhrajat
    } catch (err) {
      console.error('Akhrajat Create Error:', err)
      throw new Error(err.message || 'اخراجات شامل کرنے میں ناکامی')
    }
  })

  /* ----------------------------- UPDATE ----------------------------- */
  ipcMain.handle('akhrajat:update', async (event, data) => {
    try {
      const { id, title, description, amount, date, isGari } = data
      const parsedId = parseInt(id)
      if (isNaN(parsedId)) throw new Error('Invalid Akhrajat ID')

      // Validate title if provided
      if (title) {
        const validTitles = await prisma.akhrajatTitle.findMany()
        const validTitleNames = validTitles.map((t) => t.name)
        if (!validTitleNames.includes(title)) {
          throw new Error('غلط اخراجات کا عنوان منتخب کیا گیا ہے۔')
        }
      }

      // Optional Urdu-only desc rule
      if (description && !isUrdu(description)) {
        throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔')
      }

      // Normalize gari array
      const gariExpenses = extractFrontendGari(data)
      if (isGari && gariExpenses.length > 0) {
        validateGariExpenses(gariExpenses)
      }

      // We'll do this atomically
      const [updated] = await prisma.$transaction([
        // 1. Update base Akhrajat row
        prisma.akhrajat.update({
          where: { id: parsedId },
          data: {
            title,
            description,
            amount: amount !== undefined ? toBig(amount) : undefined,
            date: date ? new Date(date) : undefined,
            isGari: !!isGari
          }
        }),
        // 2. Delete old gariExpense rows (always clear; even if no longer gari)
        prisma.gariExpense.deleteMany({ where: { akhrajatId: parsedId } }),
        // 3. Recreate rows if still gari + provided
        ...(isGari && gariExpenses.length > 0
          ? [
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
            ]
          : [])
      ])

      // Re-fetch full record with relation
      const refreshed = await prisma.akhrajat.findUnique({
        where: { id: parsedId },
        include: { gariExpense: true, transaction: true }
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

  /* ----------------------------- DELETE ----------------------------- */
  ipcMain.handle('akhrajat:delete', async (event, id) => {
    try {
      const parsedId = parseInt(id)
      if (isNaN(parsedId)) throw new Error('Invalid Akhrajat ID')

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

  /* ----------------------------- GET ALL ----------------------------- */
  ipcMain.handle('akhrajat:getAll', async () => {
    try {
      const all = await prisma.akhrajat.findMany({
        include: {
          transaction: true,
          gariExpense: true // ✅ correct relation
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
