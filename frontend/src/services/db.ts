import initSqlJs, { type Database } from 'sql.js';
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url';

let dbInstance: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('checkers_wasm_db_store', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDbBinary(data: Uint8Array): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const request = store.put(data, 'fish_unloading.db');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save DB to IndexedDB', err);
  }
}

async function loadDbBinary(): Promise<Uint8Array | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const request = store.get('fish_unloading.db');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getDB(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: () => sqlWasm
    });

    let binary = await loadDbBinary();
    if (!binary) {
      try {
        const response = await fetch('/data/fish_unloading.db');
        if (response.ok) {
          const buf = await response.arrayBuffer();
          binary = new Uint8Array(buf);
          console.log('Loaded initial database from public/data/fish_unloading.db');
        }
      } catch (err) {
        console.warn('Could not fetch initial database from public/data, starting fresh:', err);
      }
    } else {
      console.log('Loaded database from IndexedDB storage');
    }

    if (binary) {
      dbInstance = new SQL.Database(binary);
    } else {
      dbInstance = new SQL.Database();
    }


    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_number TEXT UNIQUE,
        transaction_date TEXT,
        client_name TEXT,
        price_per_tub REAL,
        berthing_fee_per_vessel REAL,
        vat_enabled INTEGER,
        vat_rate REAL,
        total_tubs INTEGER,
        unloading_amount REAL,
        berthing_amount REAL,
        total_vat REAL,
        grand_total REAL,
        status TEXT DEFAULT 'UNPAID',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS transaction_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER,
        arrival_date TEXT,
        vessel_name TEXT,
        species TEXT,
        grt REAL DEFAULT 3,
        tubs INTEGER,
        line_unloading_amount REAL,
        line_berthing_fee REAL,
        FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL COLLATE NOCASE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);


    try {
      const res = dbInstance.exec("PRAGMA table_info(transactions)");
      if (res.length > 0) {
        const cols = res[0].values.map(v => v[1]);
        if (!cols.includes('status')) {
          dbInstance.exec("ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'UNPAID';");
        }
      }
    } catch {}


    try {
      const res = dbInstance.exec("PRAGMA table_info(transaction_records)");
      if (res.length > 0) {
        const cols = res[0].values.map(v => v[1]);
        if (!cols.includes('grt')) {
          dbInstance.exec("ALTER TABLE transaction_records ADD COLUMN grt REAL DEFAULT 3;");
        }
      }
    } catch {}

    return dbInstance;
  })();

  return dbInitPromise;
}

async function persist() {
  if (dbInstance) {
    const binary = dbInstance.export();
    await saveDbBinary(binary);
  }
}


function queryObjects(sql: string, params: any[] = []): any[] {
  if (!dbInstance) return [];
  const stmt = dbInstance.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryObjects(sql, params);
  return rows.length > 0 ? rows[0] : null;
}



export async function fetchSettings(): Promise<Record<string, string>> {
  await getDB();
  const rows = queryObjects('SELECT key, value FROM settings');
  return rows.reduce((acc, r) => {
    acc[r.key] = r.value;
    return acc;
  }, {});
}

export async function updateSettings(settingsObj: Record<string, any>): Promise<void> {
  await getDB();
  for (const [key, value] of Object.entries(settingsObj)) {
    const valStr = String(value);
    const existing = queryOne('SELECT key FROM settings WHERE key = ?', [key]);
    if (existing) {
      dbInstance!.run('UPDATE settings SET value = ? WHERE key = ?', [valStr, key]);
    } else {
      dbInstance!.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, valStr]);
    }
  }
  await persist();
}

export async function fetchClients(q?: string): Promise<any[]> {
  await getDB();
  if (q && q.trim()) {
    return queryObjects(
      'SELECT id, name FROM clients WHERE name LIKE ? ORDER BY name ASC LIMIT 20',
      [`%${q.trim()}%`]
    );
  }
  return queryObjects('SELECT id, name FROM clients ORDER BY name ASC');
}

export async function addClient(name: string): Promise<{ success: boolean; inserted: boolean }> {
  await getDB();
  const cleanName = name.trim().toUpperCase();
  if (!cleanName) return { success: false, inserted: false };
  
  const existing = queryOne('SELECT id FROM clients WHERE UPPER(name) = UPPER(?)', [cleanName]);
  if (existing) {
    return { success: true, inserted: false };
  }

  dbInstance!.run('INSERT INTO clients (name) VALUES (?)', [cleanName]);
  await persist();
  return { success: true, inserted: true };
}

export async function bulkAddClients(names: string[]): Promise<{ success: boolean; inserted: number; skipped: number; total: number }> {
  await getDB();
  let inserted = 0;
  let skipped = 0;

  for (const raw of names) {
    const name = raw.trim().toUpperCase();
    if (!name) continue;
    const existing = queryOne('SELECT id FROM clients WHERE UPPER(name) = UPPER(?)', [name]);
    if (existing) {
      skipped++;
    } else {
      dbInstance!.run('INSERT INTO clients (name) VALUES (?)', [name]);
      inserted++;
    }
  }
  await persist();
  return { success: true, inserted, skipped, total: inserted + skipped };
}

export async function deleteClient(id: number | string): Promise<void> {
  await getDB();
  dbInstance!.run('DELETE FROM clients WHERE id = ?', [id]);
  await persist();
}

export async function fetchVesselHistory(clientName: string): Promise<any[]> {
  await getDB();
  if (!clientName.trim()) return [];
  return queryObjects(`
    SELECT tr.vessel_name, tr.grt, tr.species,
           MAX(t.transaction_date) AS last_used
    FROM transaction_records tr
    JOIN transactions t ON t.id = tr.transaction_id
    WHERE UPPER(t.client_name) = UPPER(?)
    GROUP BY UPPER(tr.vessel_name)
    ORDER BY last_used DESC
    LIMIT 30
  `, [clientName.trim()]);
}

function generateTransactionNumber(): string {
  const row = queryOne('SELECT transaction_number FROM transactions ORDER BY id DESC LIMIT 1');
  if (!row || !row.transaction_number) return '000001';
  const lastNum = parseInt(row.transaction_number, 10);
  if (isNaN(lastNum)) return '000001';
  return String(lastNum + 1).padStart(6, '0');
}

export async function createTransaction(data: { client_name: string; transaction_date: string; vessels: any[] }): Promise<{ success: boolean; transaction_id: number; transaction_number: string }> {
  await getDB();
  const settings = await fetchSettings();

  const pricePerTub = parseFloat(settings.price_per_tub || '0');
  const berthingFee = parseFloat(settings.berthing_fee || '0');
  const vatEnabled = settings.vat_enabled === '1' || settings.vat_enabled === 'true';
  const vatRate = parseFloat(settings.vat_rate || '0.12');
  const transactionNumber = generateTransactionNumber();

  let totalTubs = 0;
  let unloadingAmount = 0;
  let berthingAmount = 0;

  const records = data.vessels.map((v: any) => {
    const tubs = parseInt(v.tubs || '0', 10);
    const grtVal = parseFloat(v.grt !== undefined && v.grt !== '' ? v.grt : '3');
    const lineUnloading = tubs * pricePerTub;
    const isOverland = Boolean(v.is_overland || v.isOverland || grtVal === 0);
    let lineBerthing = 0;

    if (!isOverland) {
      lineBerthing = berthingFee;
      if (grtVal === 4 || grtVal === 5 || grtVal > 3) {
        lineBerthing = 50;
      }
    }

    totalTubs += tubs;
    unloadingAmount += lineUnloading;
    berthingAmount += lineBerthing;

    return {
      arrival_date: v.arrival_date,
      vessel_name: v.vessel_name ? v.vessel_name.toUpperCase() : '',
      species: v.species ? v.species.toUpperCase() : '',
      grt: isOverland ? 0 : grtVal,
      tubs,
      line_unloading_amount: lineUnloading,
      line_berthing_fee: lineBerthing
    };
  });

  const unloadingVat = vatEnabled ? unloadingAmount * vatRate : 0;
  const totalUnloading = unloadingAmount + unloadingVat;
  const berthingVat = vatEnabled ? berthingAmount * vatRate : 0;
  const totalBerthing = berthingAmount + berthingVat;
  const totalVat = unloadingVat + berthingVat;
  const grandTotal = totalUnloading + totalBerthing;

  dbInstance!.run(`
    INSERT INTO transactions (
      transaction_number, transaction_date, client_name,
      price_per_tub, berthing_fee_per_vessel,
      vat_enabled, vat_rate,
      total_tubs, unloading_amount, berthing_amount,
      total_vat, grand_total, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNPAID')
  `, [
    transactionNumber,
    data.transaction_date,
    data.client_name.trim().toUpperCase(),
    pricePerTub,
    berthingFee,
    vatEnabled ? 1 : 0,
    vatRate,
    totalTubs,
    unloadingAmount,
    berthingAmount,
    totalVat,
    grandTotal
  ]);

  const lastIdRow = queryOne('SELECT last_insert_rowid() as id');
  const txId = lastIdRow ? lastIdRow.id : 1;

  for (const rec of records) {
    dbInstance!.run(`
      INSERT INTO transaction_records (
        transaction_id, arrival_date, vessel_name, species, grt, tubs,
        line_unloading_amount, line_berthing_fee
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      txId,
      rec.arrival_date,
      rec.vessel_name,
      rec.species,
      rec.grt,
      rec.tubs,
      rec.line_unloading_amount,
      rec.line_berthing_fee
    ]);
  }

  await persist();
  return { success: true, transaction_id: txId, transaction_number: transactionNumber };
}

export async function fetchTransactions(): Promise<any[]> {
  await getDB();
  return queryObjects('SELECT * FROM transactions ORDER BY id DESC');
}

export async function fetchTransactionById(id: number | string): Promise<any | null> {
  await getDB();
  const tx = queryOne('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!tx) return null;
  const records = queryObjects('SELECT * FROM transaction_records WHERE transaction_id = ?', [id]);
  return { ...tx, records };
}

export async function updateTransaction(id: number | string, data: { client_name: string; transaction_date: string; vessels: any[] }): Promise<void> {
  await getDB();
  const existingTx = queryOne('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!existingTx) throw new Error('Transaction not found');
  if (existingTx.status === 'PAID') throw new Error('Paid transactions cannot be edited');

  const pricePerTub = existingTx.price_per_tub || 0;
  const berthingFee = existingTx.berthing_fee_per_vessel || 0;
  const vatEnabled = existingTx.vat_enabled === 1 || existingTx.vat_enabled === '1';
  const vatRate = parseFloat(existingTx.vat_rate || '0.12');

  let totalTubs = 0;
  let unloadingAmount = 0;
  let berthingAmount = 0;

  const records = data.vessels.map((v: any) => {
    const tubs = parseInt(v.tubs || '0', 10);
    const grtVal = parseFloat(v.grt !== undefined && v.grt !== '' ? v.grt : '3');
    const lineUnloading = tubs * pricePerTub;
    const isOverland = Boolean(v.is_overland || v.isOverland || grtVal === 0);
    let lineBerthing = 0;

    if (!isOverland) {
      lineBerthing = berthingFee;
      if (grtVal === 4 || grtVal === 5 || grtVal > 3) {
        lineBerthing = 50;
      }
    }

    totalTubs += tubs;
    unloadingAmount += lineUnloading;
    berthingAmount += lineBerthing;

    return {
      arrival_date: v.arrival_date,
      vessel_name: v.vessel_name ? v.vessel_name.toUpperCase() : '',
      species: v.species ? v.species.toUpperCase() : '',
      grt: isOverland ? 0 : grtVal,
      tubs,
      line_unloading_amount: lineUnloading,
      line_berthing_fee: lineBerthing
    };
  });

  const unloadingVat = vatEnabled ? unloadingAmount * vatRate : 0;
  const totalUnloading = unloadingAmount + unloadingVat;
  const berthingVat = vatEnabled ? berthingAmount * vatRate : 0;
  const totalBerthing = berthingAmount + berthingVat;
  const totalVat = unloadingVat + berthingVat;
  const grandTotal = totalUnloading + totalBerthing;

  dbInstance!.run(`
    UPDATE transactions SET
      client_name = ?,
      transaction_date = ?,
      total_tubs = ?,
      unloading_amount = ?,
      berthing_amount = ?,
      total_vat = ?,
      grand_total = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    data.client_name.trim().toUpperCase(),
    data.transaction_date,
    totalTubs,
    unloadingAmount,
    berthingAmount,
    totalVat,
    grandTotal,
    id
  ]);

  dbInstance!.run('DELETE FROM transaction_records WHERE transaction_id = ?', [id]);

  for (const rec of records) {
    dbInstance!.run(`
      INSERT INTO transaction_records (
        transaction_id, arrival_date, vessel_name, species, grt, tubs,
        line_unloading_amount, line_berthing_fee
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      rec.arrival_date,
      rec.vessel_name,
      rec.species,
      rec.grt,
      rec.tubs,
      rec.line_unloading_amount,
      rec.line_berthing_fee
    ]);
  }

  await persist();
}

export async function updateTransactionStatus(id: number | string, status: string): Promise<void> {
  await getDB();
  dbInstance!.run('UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
  await persist();
}

function recalculateTxTotals(txId: number | string) {
  const tx = queryOne('SELECT * FROM transactions WHERE id = ?', [txId]);
  if (!tx) return;

  const records = queryObjects('SELECT * FROM transaction_records WHERE transaction_id = ?', [txId]);
  if (records.length === 0) {
    dbInstance!.run(`
      UPDATE transactions SET
        total_tubs = 0, unloading_amount = 0, berthing_amount = 0, total_vat = 0, grand_total = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [txId]);
    return;
  }

  const pricePerTub = tx.price_per_tub || 0;
  const berthingFee = tx.berthing_fee_per_vessel || 0;
  const vatEnabled = tx.vat_enabled === 1 || tx.vat_enabled === '1';
  const vatRate = parseFloat(tx.vat_rate || '0');

  let totalTubs = 0;
  let unloadingAmount = 0;
  let berthingAmount = 0;

  for (const rec of records) {
    const tubs = parseInt(rec.tubs || 0, 10);
    const grtVal = parseFloat(rec.grt !== undefined && rec.grt !== null ? rec.grt : 3);
    const lineUnloading = tubs * pricePerTub;

    const isOverland = grtVal === 0 || rec.vessel_name?.startsWith('TRUCK');
    let lineBerthing = 0;
    if (!isOverland) {
      lineBerthing = berthingFee;
      if (grtVal === 4 || grtVal === 5 || grtVal > 3) {
        lineBerthing = 50;
      }
    }

    dbInstance!.run(`
      UPDATE transaction_records SET
        line_unloading_amount = ?,
        line_berthing_fee = ?
      WHERE id = ?
    `, [lineUnloading, lineBerthing, rec.id]);

    totalTubs += tubs;
    unloadingAmount += lineUnloading;
    berthingAmount += lineBerthing;
  }

  const unloadingVat = vatEnabled ? unloadingAmount * vatRate : 0;
  const totalUnloading = unloadingAmount + unloadingVat;
  const berthingVat = vatEnabled ? berthingAmount * vatRate : 0;
  const totalBerthing = berthingAmount + berthingVat;
  const totalVat = unloadingVat + berthingVat;
  const grandTotal = totalUnloading + totalBerthing;

  dbInstance!.run(`
    UPDATE transactions SET
      total_tubs = ?, unloading_amount = ?, berthing_amount = ?, total_vat = ?, grand_total = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [totalTubs, unloadingAmount, berthingAmount, totalVat, grandTotal, txId]);
}

export async function transferRecord(payload: { record_id: number | string; target_transaction_id?: number | string; target_client_name?: string; target_date?: string }): Promise<{ success: boolean; target_transaction_id: number }> {
  await getDB();
  const record = queryOne('SELECT * FROM transaction_records WHERE id = ?', [payload.record_id]);
  if (!record) throw new Error('Transaction record not found');

  const sourceTxId = record.transaction_id;
  const sourceTx = queryOne('SELECT * FROM transactions WHERE id = ?', [sourceTxId]);
  if (sourceTx && sourceTx.status === 'PAID') throw new Error('Cannot transfer record from a PAID transaction');

  let destinationTxId = payload.target_transaction_id;

  if (!destinationTxId && payload.target_client_name) {
    const settings = await fetchSettings();
    const pricePerTub = parseFloat(settings.price_per_tub || '0');
    const berthingFee = parseFloat(settings.berthing_fee || '0');
    const vatEnabled = settings.vat_enabled === '1' || settings.vat_enabled === 'true';
    const vatRate = parseFloat(settings.vat_rate || '0.12');
    const transactionNumber = generateTransactionNumber();

    dbInstance!.run(`
      INSERT INTO transactions (
        transaction_number, transaction_date, client_name,
        price_per_tub, berthing_fee_per_vessel,
        vat_enabled, vat_rate,
        total_tubs, unloading_amount, berthing_amount,
        total_vat, grand_total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 'UNPAID')
    `, [
      transactionNumber,
      payload.target_date || new Date().toISOString().split('T')[0],
      payload.target_client_name.trim().toUpperCase(),
      pricePerTub,
      berthingFee,
      vatEnabled ? 1 : 0,
      vatRate
    ]);

    const lastIdRow = queryOne('SELECT last_insert_rowid() as id');
    destinationTxId = lastIdRow ? lastIdRow.id : 1;
  }

  if (!destinationTxId) throw new Error('Target transaction or client name is required');

  const targetTx = queryOne('SELECT * FROM transactions WHERE id = ?', [destinationTxId]);
  if (!targetTx) throw new Error('Target transaction not found');
  if (targetTx.status === 'PAID') throw new Error('Cannot transfer record to a PAID transaction');

  dbInstance!.run('UPDATE transaction_records SET transaction_id = ? WHERE id = ?', [destinationTxId, payload.record_id]);

  recalculateTxTotals(sourceTxId);
  recalculateTxTotals(destinationTxId);

  await persist();
  return { success: true, target_transaction_id: Number(destinationTxId) };
}

export async function exportDatabaseBackup(): Promise<Blob> {
  await getDB();
  const binary = dbInstance!.export();
  return new Blob([binary.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
}

export async function importDatabaseBackup(arrayBuffer: ArrayBuffer): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => sqlWasm });
  const binary = new Uint8Array(arrayBuffer);
  dbInstance = new SQL.Database(binary);
  await persist();
}
