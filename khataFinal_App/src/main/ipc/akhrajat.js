import prisma from '../../../prisma/client.js';

/* ================================================================
 * Constants
 * ============================================================== */
const MUTAFARIK_LABEL = 'متفرق';

/* ================================================================
 * Helpers
 * ============================================================== */
const isUrdu = (text = '') => /^[\u0600-\u06FF\s]+$/.test(text);

const bi2n = (v) => {
  if (v == null) return 0;
  if (typeof v === 'bigint') {
    const asNum = Number(v);
    return Number.isFinite(asNum) ? asNum : Number(v.toString());
  }
  return Number(v);
};

const toSlug = (raw = '') => {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return '';
  if (['petrol', 'پٹرول'].includes(v)) return 'petrol';
  if (['diesel', 'ڈیزل'].includes(v)) return 'diesel';
  if (['repairing', 'مرمت'].includes(v)) return 'repairing';
  if (['tuning', 'ٹیوننگ', 'ٹوننگ'].includes(v)) return 'tuning';
  return v;
};

const toBig = (val) => {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'bigint') return val;
  const n = typeof val === 'number' ? val : parseInt(val, 10);
  if (Number.isNaN(n)) return undefined;
  return BigInt(n);
};

const coerceGariArray = (maybe) => {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe;
  return [maybe];
};

const extractFrontendGari = (data) => {
  const raw = data?.gariExpenses ?? data?.gariExpense ?? [];
  return coerceGariArray(raw);
};

const validateGariExpenses = (gariExpenses) => {
  for (const exp of gariExpenses) {
    if (!exp?.title) throw new Error('گاڑی خرچ کی قسم درکار ہے۔');
    const type = toSlug(exp.title);
    if (['petrol', 'diesel'].includes(type)) {
      if (!exp.quantity || Number(exp.quantity) <= 0) {
        throw new Error('پٹرول یا ڈیزل کیلئے مقدار درکار ہے۔');
      }
    }
    if (type === 'repairing') {
      if (!exp.part || !String(exp.part).trim()) {
        throw new Error('مرمت کے لیے پرزہ کا نام درکار ہے۔');
      }
    }
  }
};

const resolveOthersTitlesId = async (nameOrId) => {
  if (nameOrId == null) return null;
  if (typeof nameOrId === 'number' && !Number.isNaN(nameOrId)) {
    const found = await prisma.othersTitles.findUnique({ where: { id: nameOrId } });
    return found ? found.id : null;
  }
  if (typeof nameOrId === 'string') {
    const nm = nameOrId.trim();
    if (!nm) return null;
    const found = await prisma.othersTitles.findUnique({ where: { name: nm } });
    if (found) return found.id;
    const created = await prisma.othersTitles.create({ data: { name: nm } });
    return created.id;
  }
  return null;
};

/**
 * Update transaction's KulAkhrajat, SaafiAmdan, and KulMaizan based on akhrajat amounts.
 */
const updateTransactionTotals = async (transactionId) => {
  const akhrajatRows = await prisma.akhrajat.findMany({
    where: { transactionId },
    select: { amount: true },
  });
  const totalAkhrajat = akhrajatRows.reduce((sum, row) => sum + bi2n(row.amount), 0);
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { KulAmdan: true, Exercise: true },
  });
  const kulAmdan = bi2n(transaction.KulAmdan);
  const exercise = bi2n(transaction.Exercise);
  const saafiAmdan = kulAmdan - totalAkhrajat;
  const kulMaizan = saafiAmdan + exercise;

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      KulAkhrajat: BigInt(totalAkhrajat),
      SaafiAmdan: BigInt(saafiAmdan),
      KulMaizan: BigInt(kulMaizan),
    },
  });
};

/* ================================================================
 * Main IPC Handlers
 * ============================================================== */
const akhrajatHandlers = (ipcMain) => {
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
        otherTitle,
      } = data ?? {};

      if (!title || !transactionId || amount === undefined || amount === null) {
        throw new Error('عنوان، لین دین کی شناخت، یا رقم غائب ہے۔');
      }

      const txId = parseInt(transactionId, 10);
      if (Number.isNaN(txId)) throw new Error('غلط لین دین شناخت۔');

      const titleRow = await prisma.akhrajatTitle.findUnique({
        where: { name: title },
      });
      if (!titleRow) {
        throw new Error('غلط اخراجات کا عنوان منتخب کیا گیا ہے۔');
      }

      const isGari = !!titleRow.isGari;
      const isOther = isOtherFromClient === true || title === MUTAFARIK_LABEL;

      if (!isOther && description && !isUrdu(description)) {
        throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔');
      }

      const tx = await prisma.transaction.findUnique({
        where: { id: txId },
        select: { date: true },
      });
      const txDate = tx?.date ? new Date(tx.date) : new Date();

      const gariExpenses = extractFrontendGari(data);
      if (isGari && gariExpenses.length > 0) {
        validateGariExpenses(gariExpenses);
      }

      const baseData = {
        title,
        description: description ?? null,
        amount: toBig(amount) ?? BigInt(0),
        date: txDate,
        isGari,
        isOther,
        transaction: { connect: { id: txId } },
      };

      let otherConnect;
      if (isOther) {
        const candidate = othersTitlesId ?? otherTitle ?? description;
        const resolvedId = await resolveOthersTitlesId(candidate);
        if (!resolvedId) {
          throw new Error('متفرق اخراجات کے ذیلی عنوان کا انتخاب ضروری ہے۔');
        }
        otherConnect = { connect: { id: resolvedId } };
      }

      const createPayload = {
        ...baseData,
        ...(otherConnect ? { othersTitles: otherConnect } : {}),
        ...(isGari && gariExpenses.length > 0
          ? {
              gariExpense: {
                create: gariExpenses.map((g) => ({
                  title: g.title,
                  quantity: ['petrol', 'diesel'].includes(toSlug(g.title)) && g.quantity !== undefined
                    ? Number(g.quantity)
                    : null,
                  part: toSlug(g.title) === 'repairing' ? g.part || null : null,
                })),
              },
            }
          : {}),
      };

      const newAkhrajat = await prisma.$transaction([
        prisma.akhrajat.create({
          data: createPayload,
          include: { gariExpense: true, othersTitles: true },
        }),
      ]);

      // Update transaction totals
      await updateTransactionTotals(txId);

      return newAkhrajat[0];
    } catch (err) {
      console.error('Akhrajat Create Error:', err);
      throw new Error(err.message || 'اخراجات شامل کرنے میں ناکامی');
    }
  });

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
        otherTitle,
      } = data ?? {};

      const parsedId = parseInt(id, 10);
      if (Number.isNaN(parsedId)) throw new Error('Invalid Akhrajat ID');

      const existing = await prisma.akhrajat.findUnique({
        where: { id: parsedId },
        include: { transaction: true, othersTitles: true },
      });
      if (!existing) throw new Error('اخراجات ریکارڈ نہیں ملا۔');

      let titleRow = null;
      if (title) {
        titleRow = await prisma.akhrajatTitle.findUnique({ where: { name: title } });
        if (!titleRow) {
          throw new Error('غلط اخراجات کا عنوان منتخب کیا گیا ہے۔');
        }
      }

      const effectiveTitle = title ?? existing.title;
      const effectiveTitleRow =
        titleRow ??
        (await prisma.akhrajatTitle.findUnique({
          where: { name: existing.title },
        }));
      const isGari = effectiveTitleRow?.isGari ?? existing.isGari ?? false;
      const isOther = isOtherFromClient === true || effectiveTitle === MUTAFARIK_LABEL;

      if (!isOther && description && !isUrdu(description)) {
        throw new Error('اخراجات کی تفصیل صرف اردو میں درج کریں۔');
      }

      const gariExpenses = extractFrontendGari(data);
      if (isGari && gariExpenses.length > 0) {
        validateGariExpenses(gariExpenses);
      }

      const updateData = {
        title,
        description: description ?? undefined,
        amount: amount !== undefined ? toBig(amount) : undefined,
        date: date ? new Date(date) : undefined,
        isGari,
        isOther,
      };

      if (isOther) {
        const candidate = othersTitlesId ?? otherTitle ?? description ?? existing.othersTitles?.name;
        const resolvedId = await resolveOthersTitlesId(candidate);
        if (!resolvedId) {
          throw new Error('متفرق اخراجات کے ذیلی عنوان کا انتخاب ضروری ہے۔');
        }
        updateData.othersTitles = { connect: { id: resolvedId } };
      } else {
        updateData.othersTitles = { disconnect: true };
      }

      const txOps = [
        prisma.akhrajat.update({
          where: { id: parsedId },
          data: updateData,
        }),
        prisma.gariExpense.deleteMany({ where: { akhrajatId: parsedId } }),
      ];

      if (isGari && gariExpenses.length > 0) {
        txOps.push(
          prisma.gariExpense.createMany({
            data: gariExpenses.map((g) => ({
              akhrajatId: parsedId,
              title: g.title,
              quantity: ['petrol', 'diesel'].includes(toSlug(g.title)) && g.quantity !== undefined
                ? Number(g.quantity)
                : null,
              part: toSlug(g.title) === 'repairing' ? g.part || null : null,
            })),
          })
        );
      }

      const [updated] = await prisma.$transaction(txOps);

      await updateTransactionTotals(updated.transactionId);

      const refreshed = await prisma.akhrajat.findUnique({
        where: { id: parsedId },
        include: { gariExpense: true, transaction: true, othersTitles: true },
      });

      return refreshed;
    } catch (err) {
      console.error('Akhrajat Update Error:', err);
      throw new Error(err.message || 'اخراجات کی تفصیل اپڈیٹ نہیں ہو سکی۔');
    }
  });

  ipcMain.handle('akhrajat:delete', async (_event, id) => {
    try {
      const parsedId = parseInt(id, 10);
      if (Number.isNaN(parsedId)) throw new Error('Invalid Akhrajat ID');

      const deleted = await prisma.akhrajat.delete({
        where: { id: parsedId },
      });

      await updateTransactionTotals(deleted.transactionId);

      return deleted;
    } catch (err) {
      console.error('Akhrajat Delete Error:', err);
      throw new Error(err.message || 'اخراجات حذف کرنے میں ناکامی');
    }
  });

  ipcMain.handle('akhrajat:getAll', async () => {
    try {
      const all = await prisma.akhrajat.findMany({
        include: {
          transaction: true,
          gariExpense: true,
          othersTitles: true,
        },
      });
      return all;
    } catch (err) {
      console.error('Akhrajat GetAll Error:', err);
      throw new Error('اخراجات ڈیٹا لوڈ کرنے میں ناکامی');
    }
  });

  ipcMain.handle('akhrajat:gariSummary', async (_event, params) => {
    const { gariTitle, zoneName, khdaName, dateFrom, dateTo } = params || {};

    if (!gariTitle) {
      throw new Error('گاڑی کا نام درکار ہے۔');
    }

    const dateFilter =
      dateFrom || dateTo
        ? {
            gte: dateFrom ? new Date(dateFrom) : undefined,
            lte: dateTo ? new Date(dateTo) : undefined,
          }
        : undefined;

    const txFilter = {};
    if (zoneName) txFilter.ZoneName = zoneName;
    if (khdaName) txFilter.KhdaName = khdaName;

    const where = {
      isGari: true,
      title: gariTitle,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(Object.keys(txFilter).length ? { transaction: { is: txFilter } } : {}),
    };

    const rows = await prisma.akhrajat.findMany({
      where,
      include: {
        transaction: {
          select: {
            id: true,
            date: true,
            ZoneName: true,
            KhdaName: true,
          },
        },
        gariExpense: true,
        othersTitles: true,
      },
      orderBy: {
        transaction: { date: 'asc' },
      },
    });

    const totals = { amount: 0, count: 0 };
    const byType = {};
    const repairParts = {};

    for (const row of rows) {
      const amt = bi2n(row.amount);
      totals.amount += amt;
      totals.count += 1;

      const gx = row.gariExpense?.[0];
      const gxTitle = gx?.title || 'دیگر';
      const gxQty = gx?.quantity ?? null;
      const gxPart = gx?.part ?? null;

      if (!byType[gxTitle]) {
        byType[gxTitle] = {
          amount: 0,
          totalQuantity: 0,
          count: 0,
          entries: [],
        };
      }
      const bucket = byType[gxTitle];
      bucket.amount += amt;
      bucket.count += 1;
      if (gxQty != null) bucket.totalQuantity += Number(gxQty);

      bucket.entries.push({
        date: row.transaction?.date?.toISOString?.() ?? row.transaction?.date ?? row.date,
        amount: amt,
        quantity: gxQty,
        part: gxPart,
        transactionId: row.transaction?.id,
        zone: row.transaction?.ZoneName,
        khda: row.transaction?.KhdaName,
      });

      if (gxTitle === 'مرمت') {
        const p = gxPart || 'نامعلوم پرزہ';
        if (!repairParts[p]) {
          repairParts[p] = {
            amount: 0,
            count: 0,
            entries: [],
          };
        }
        const partBucket = repairParts[p];
        partBucket.amount += amt;
        partBucket.count += 1;
        partBucket.entries.push({
          date: row.transaction?.date?.toISOString?.() ?? row.transaction?.date ?? row.date,
          amount: amt,
          transactionId: row.transaction?.id,
          zone: row.transaction?.ZoneName,
          khda: row.transaction?.KhdaName,
        });
      }
    }

    return {
      gariTitle,
      filters: { zoneName, khdaName, dateFrom, dateTo },
      totals,
      byType,
      repairParts,
      rawCount: rows.length,
    };
  });
};

export default akhrajatHandlers;
