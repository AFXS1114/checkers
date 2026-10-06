import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'data', 'fish_unloading.db');
const schemaPath = path.join(__dirname, '..', 'schema.sql');


const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');


try {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('Database schema initialized.');
    

    const tableInfo = db.prepare("PRAGMA table_info(transaction_records)").all() as any[];
    const hasGrt = tableInfo.some(col => col.name === 'grt');
    if (!hasGrt) {
        db.exec("ALTER TABLE transaction_records ADD COLUMN grt REAL DEFAULT 3;");
        console.log('Added grt column to transaction_records table.');
    }


    const txTableInfo = db.prepare("PRAGMA table_info(transactions)").all() as any[];
    const hasStatus = txTableInfo.some(col => col.name === 'status');
    if (!hasStatus) {
        db.exec("ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'UNPAID';");
        console.log("Added status column to transactions table.");
    }
    const hasTbfNumber = txTableInfo.some(col => col.name === 'tbf_number');
    if (!hasTbfNumber) {
        db.exec("ALTER TABLE transactions ADD COLUMN tbf_number TEXT;");
        console.log("Added tbf_number column to transactions table.");
    }

    const recTableInfo = db.prepare("PRAGMA table_info(transaction_records)").all() as any[];
    const hasRecTbfNumber = recTableInfo.some(col => col.name === 'tbf_number');
    if (!hasRecTbfNumber) {
        db.exec("ALTER TABLE transaction_records ADD COLUMN tbf_number TEXT;");
        console.log("Added tbf_number column to transaction_records table.");
    }
} catch (error) {
    console.error('Error initializing database schema:', error);
}

export default db;
