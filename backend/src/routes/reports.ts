import express from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db';
import ExcelJS from 'exceljs';
import Database from 'better-sqlite3';

const router = express.Router();

router.get('/export', async (req, res) => {
    try {
        const status = (req.query.status as string) || 'ALL';
        const format = (req.query.format as string) || 'xlsx';

        let txQuery = 'SELECT * FROM transactions';
        let recQuery = 'SELECT tr.* FROM transaction_records tr JOIN transactions t ON t.id = tr.transaction_id';
        const params: any[] = [];

        if (status === 'PAID' || status === 'UNPAID') {
            txQuery += ' WHERE status = ?';
            recQuery += ' WHERE t.status = ?';
            params.push(status);
        }

        const transactions = db.prepare(txQuery).all(...params) as any[];
        const records = db.prepare(recQuery).all(...params) as any[];

        if (format === 'xlsx') {
            let detailedQuery = `
                SELECT 
                    t.transaction_number,
                    t.transaction_date,
                    t.client_name,
                    t.tbf_number,
                    t.status,
                    tr.arrival_date,
                    tr.vessel_name,
                    tr.species,
                    tr.grt,
                    tr.tubs,
                    tr.line_unloading_amount,
                    tr.line_berthing_fee
                FROM transaction_records tr
                JOIN transactions t ON t.id = tr.transaction_id
            `;
            if (status === 'PAID' || status === 'UNPAID') {
                detailedQuery += ' WHERE t.status = ?';
            }
            detailedQuery += ' ORDER BY t.transaction_date DESC, t.id DESC';

            const detailedRecords = db.prepare(detailedQuery).all(...params) as any[];

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Detailed Report');

            if (detailedRecords.length > 0) {
                sheet.columns = Object.keys(detailedRecords[0]).map(key => ({ 
                    header: key.toUpperCase().replace(/_/g, ' '), 
                    key: key, 
                    width: 20 
                }));
                detailedRecords.forEach(rec => sheet.addRow(rec));
                sheet.getRow(1).font = { bold: true };
            } else {
                sheet.addRow(['No records found for this status.']);
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="detailed_report_${status}_${Date.now()}.xlsx"`);
            await workbook.xlsx.write(res);
            res.end();
            return;
        } 
        
        if (format === 'db') {
            const exportName = `export_${status}_${Date.now()}.db`;
            const exportPath = path.join(__dirname, '..', '..', 'data', exportName);
            
            const exportDb = new Database(exportPath);
            
            const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf-8');
            exportDb.exec(schema);

            if (transactions.length > 0) {
                const txKeys = Object.keys(transactions[0]);
                const txPlaceholders = txKeys.map(() => '?').join(', ');
                const insertTx = exportDb.prepare(`INSERT INTO transactions (${txKeys.join(', ')}) VALUES (${txPlaceholders})`);
                const insertManyTx = exportDb.transaction((txs) => {
                    for (const tx of txs) insertTx.run(...txKeys.map(k => tx[k] === undefined ? null : tx[k]));
                });
                insertManyTx(transactions);
            }

            if (records.length > 0) {
                const recKeys = Object.keys(records[0]);
                const recPlaceholders = recKeys.map(() => '?').join(', ');
                const insertRec = exportDb.prepare(`INSERT INTO transaction_records (${recKeys.join(', ')}) VALUES (${recPlaceholders})`);
                const insertManyRec = exportDb.transaction((recs) => {
                    for (const rec of recs) insertRec.run(...recKeys.map(k => rec[k] === undefined ? null : rec[k]));
                });
                insertManyRec(records);
            }

            exportDb.close();

            res.download(exportPath, exportName, (err) => {
                if (err) console.error('Download error:', err);
                try {
                    fs.unlinkSync(exportPath);
                } catch (e) {
                    console.error('Error removing export db', e);
                }
            });
            return;
        }

        res.status(400).json({ error: 'Invalid format. Must be xlsx or db' });
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Export failed' });
    }
});

export default router;
