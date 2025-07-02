import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import fetch from 'node-fetch';

const CLOUD_SYNC_URL = 'https://remotekhata-production.up.railway.app/sync/transactions';

// Helper: Convert BigInt fields to Number for safe JSON
function normalizeTxn(txn) {
  return {
    ...txn,
    KulAmdan: Number(txn.KulAmdan),
    KulAkhrajat: Number(txn.KulAkhrajat),
    SaafiAmdan: Number(txn.SaafiAmdan),
    Exercise: Number(txn.Exercise),
    KulMaizan: Number(txn.KulMaizan),
    trollies: txn.trollies?.map(t => ({
      ...t,
      StartingNum: Number(t.StartingNum),
      EndingNum: Number(t.EndingNum),
    })),
    akhrajat: txn.akhrajat?.map(a => ({
      ...a,
      amount: Number(a.amount),
    })),
  };
}

const syncHandlers = (ipcMain) => {
  ipcMain.handle('sync:transactions', async () => {
    try {
      // 1. Get local transactions with relations
      const localTxns = await prisma.transaction.findMany({
        include: { trollies: true, akhrajat: true }
      });

      const localIds = localTxns.map(t => t.id);

      // 2. Ask cloud: what transactions with these IDs already exist?
      const cloudResponse = await fetch(CLOUD_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'get', localIds })
      });

      if (!cloudResponse.ok) throw new Error('Failed to fetch cloud transactions');
      const cloudTxns = await cloudResponse.json();
      const syncedCloudIds = cloudTxns.map(t => t.id);

      // 3. Decide what to create, update, delete
      const toCreate = localTxns.filter(t => !t.Synced).map(normalizeTxn);
      const toUpdate = localTxns
        .filter(t => t.Synced && t.SyncedAt && new Date(t.updatedAt) > new Date(t.SyncedAt))
        .map(normalizeTxn);
      const toDelete = syncedCloudIds.filter(id => !localIds.includes(id));

      // 4. Push changes to cloud
      const syncResponse = await fetch(CLOUD_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sync',
          create: toCreate,
          update: toUpdate,
          delete: toDelete
        })
      });

      if (!syncResponse.ok) throw new Error('Cloud sync failed');

      // 5. Mark local transactions as synced
      const now = new Date();
      const allSynced = [...toCreate, ...toUpdate];

      for (const txn of allSynced) {
        await prisma.transaction.update({
          where: { id: txn.id },
          data: { Synced: true, SyncedAt: now }
        });
      }

      return {
        success: true,
        synced: allSynced.length,
        deleted: toDelete.length
      };

    } catch (err) {
      console.error('[SYNC FAILED]', err);
      return {
        success: false,
        error: err.message
      };
    }
  });
};

export default syncHandlers;
