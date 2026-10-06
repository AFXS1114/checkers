import express from 'express';
import db from '../db';

const router = express.Router();


function generateTransactionNumber() {
    const row: any = db.prepare('SELECT transaction_number FROM transactions ORDER BY id DESC LIMIT 1').get();
    if (!row) return '000001';
    
    const lastNumber = parseInt(row.transaction_number, 10);
    if (isNaN(lastNumber)) {
        return '000001'; // Fallback
    }
    
    const nextNumber = lastNumber + 1;
    return String(nextNumber).padStart(6, '0');
}

router.post('/', (req, res) => {
    const { client_name, transaction_date, vessels } = req.body;
    
    if (!client_name || !vessels || vessels.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {

        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings: any = rows.reduce((acc: any, row: any) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        const pricePerTub = parseFloat(settings.price_per_tub || '0');
        const berthingFee = parseFloat(settings.berthing_fee || '0');
        const vatEnabled = settings.vat_enabled === '1' || settings.vat_enabled === 'true';
        const vatRate = parseFloat(settings.vat_rate || '0.12');

        const transactionNumber = generateTransactionNumber();


        let totalTubs = 0;
        let unloadingAmount = 0;
        let berthingAmount = 0;

        const records = vessels.map((v: any) => {
            const tubs = parseInt(v.tubs || '0', 10);
            const grtVal = parseFloat(v.grt !== undefined && v.grt !== '' ? v.grt : '3');
            const lineUnloading = tubs * pricePerTub;
            
            const isOverland = Boolean(v.is_overland || v.isOverland);
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
                vessel_name: v.vessel_name,
                species: v.species || '',
                grt: grtVal,
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

        const insertTx = db.prepare(`
            INSERT INTO transactions (
                transaction_number, transaction_date, client_name, 
                price_per_tub, berthing_fee_per_vessel, 
                vat_enabled, vat_rate, 
                total_tubs, unloading_amount, berthing_amount, 
                total_vat, grand_total
            ) VALUES (
                @transaction_number, @transaction_date, @client_name,
                @price_per_tub, @berthing_fee,
                @vat_enabled, @vat_rate,
                @total_tubs, @unloading_amount, @berthing_amount,
                @total_vat, @grand_total
            )
        `);

        const insertRecord = db.prepare(`
            INSERT INTO transaction_records (
                transaction_id, arrival_date, vessel_name, species, grt, tubs,
                line_unloading_amount, line_berthing_fee
            ) VALUES (
                @transaction_id, @arrival_date, @vessel_name, @species, @grt, @tubs,
                @line_unloading_amount, @line_berthing_fee
            )
        `);


        const saveTransaction = db.transaction(() => {
            const txResult = insertTx.run({
                transaction_number: transactionNumber,
                transaction_date: transaction_date,
                client_name,
                price_per_tub: pricePerTub,
                berthing_fee: berthingFee,
                vat_enabled: vatEnabled ? 1 : 0,
                vat_rate: vatRate,
                total_tubs: totalTubs,
                unloading_amount: unloadingAmount,
                berthing_amount: berthingAmount,
                total_vat: totalVat,
                grand_total: grandTotal
            });

            const txId = txResult.lastInsertRowid;

            for (const rec of records) {
                insertRecord.run({
                    transaction_id: txId,
                    arrival_date: rec.arrival_date,
                    vessel_name: rec.vessel_name,
                    species: rec.species,
                    grt: rec.is_overland ? 0 : rec.grt,
                    tubs: rec.tubs,
                    line_unloading_amount: rec.line_unloading_amount,
                    line_berthing_fee: rec.line_berthing_fee
                });
            }

            return txId;
        });

        const txId = saveTransaction();
        res.json({ success: true, transaction_id: txId, transaction_number: transactionNumber });

    } catch (err) {
        console.error('Save transaction error:', err);
        res.status(500).json({ error: 'Failed to save transaction' });
    }
});

router.get('/', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM transactions ORDER BY id DESC').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

router.get('/:id', (req, res) => {
    try {
        const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
        if (!tx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        const records = db.prepare('SELECT * FROM transaction_records WHERE transaction_id = ?').all(req.params.id);
        res.json({ ...tx, records });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
});

router.put('/:id', (req, res) => {
    const txId = req.params.id;
    const { client_name, transaction_date, vessels } = req.body;

    if (!vessels || !Array.isArray(vessels) || vessels.length === 0) {
        return res.status(400).json({ error: 'At least one vessel record is required' });
    }

    try {
        const existingTx: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
        if (!existingTx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (existingTx.status === 'PAID') {
            return res.status(403).json({ error: 'Paid transactions cannot be edited' });
        }

        const pricePerTub = existingTx.price_per_tub;
        const berthingFee = existingTx.berthing_fee_per_vessel;
        const vatEnabled = existingTx.vat_enabled === 1 || existingTx.vat_enabled === '1';
        const vatRate = existingTx.vat_rate;

        let totalTubs = 0;
        let unloadingAmount = 0;
        let berthingAmount = 0;

        const records = vessels.map((v: any) => {
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

        const updateTx = db.prepare(`
            UPDATE transactions SET
                client_name = @client_name,
                transaction_date = @transaction_date,
                total_tubs = @total_tubs,
                unloading_amount = @unloading_amount,
                berthing_amount = @berthing_amount,
                total_vat = @total_vat,
                grand_total = @grand_total,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `);

        const deleteRecords = db.prepare('DELETE FROM transaction_records WHERE transaction_id = ?');

        const insertRecord = db.prepare(`
            INSERT INTO transaction_records (
                transaction_id, arrival_date, vessel_name, species, grt, tubs,
                line_unloading_amount, line_berthing_fee
            ) VALUES (
                @transaction_id, @arrival_date, @vessel_name, @species, @grt, @tubs,
                @line_unloading_amount, @line_berthing_fee
            )
        `);

        const updateTransaction = db.transaction(() => {
            updateTx.run({
                id: txId,
                client_name: client_name || existingTx.client_name,
                transaction_date: transaction_date || existingTx.transaction_date,
                total_tubs: totalTubs,
                unloading_amount: unloadingAmount,
                berthing_amount: berthingAmount,
                total_vat: totalVat,
                grand_total: grandTotal
            });

            deleteRecords.run(txId);

            for (const rec of records) {
                insertRecord.run({
                    transaction_id: txId,
                    arrival_date: rec.arrival_date,
                    vessel_name: rec.vessel_name,
                    species: rec.species,
                    grt: rec.grt,
                    tubs: rec.tubs,
                    line_unloading_amount: rec.line_unloading_amount,
                    line_berthing_fee: rec.line_berthing_fee
                });
            }
        });

        updateTransaction();
        res.json({ success: true });

    } catch (err) {
        console.error('Update transaction error:', err);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});

router.patch('/:id/status', (req, res) => {
    const txId = req.params.id;
    const { status, tbf_number } = req.body;

    if (!status || !['PAID', 'UNPAID'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be PAID or UNPAID.' });
    }

    if (status === 'PAID' && (!tbf_number || !String(tbf_number).trim())) {
        return res.status(400).json({ error: 'TBF Number is required to mark a transaction as PAID.' });
    }

    try {
        const existingTx: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
        if (!existingTx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const markPaid = db.transaction(() => {
            const tbf = status === 'PAID' ? String(tbf_number).trim().toUpperCase() : null;
            db.prepare('UPDATE transactions SET status = ?, tbf_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(status, tbf, txId);

            // Stamp tbf_number on all vessel records belonging to this transaction
            if (status === 'PAID' && tbf) {
                db.prepare('UPDATE transaction_records SET tbf_number = ? WHERE transaction_id = ?')
                    .run(tbf, txId);
            }
        });

        markPaid();
        res.json({ success: true, status, tbf_number: status === 'PAID' ? String(tbf_number).trim().toUpperCase() : null });
    } catch (err) {
        console.error('Mark transaction status error:', err);
        res.status(500).json({ error: 'Failed to update transaction status' });
    }
});

router.patch('/:id/tbf', (req, res) => {
    const txId = req.params.id;
    const { tbf_number } = req.body;

    if (!tbf_number || !String(tbf_number).trim()) {
        return res.status(400).json({ error: 'TBF Number is required.' });
    }

    try {
        const existingTx: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
        if (!existingTx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (existingTx.status !== 'PAID') {
            return res.status(400).json({ error: 'TBF number can only be updated on PAID transactions.' });
        }

        const tbf = String(tbf_number).trim().toUpperCase();

        const updateTbf = db.transaction(() => {
            db.prepare('UPDATE transactions SET tbf_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(tbf, txId);
            db.prepare('UPDATE transaction_records SET tbf_number = ? WHERE transaction_id = ?')
                .run(tbf, txId);
        });

        updateTbf();
        res.json({ success: true, tbf_number: tbf });
    } catch (err) {
        console.error('Update TBF number error:', err);
        res.status(500).json({ error: 'Failed to update TBF number' });
    }
});

function recalculateTxTotals(txId: number) {
    const tx: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
    if (!tx) return;

    const records = db.prepare('SELECT * FROM transaction_records WHERE transaction_id = ?').all(txId) as any[];

    if (records.length === 0) {
        db.prepare(`
            UPDATE transactions SET
                total_tubs = 0, unloading_amount = 0, berthing_amount = 0, total_vat = 0, grand_total = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(txId);
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

        db.prepare(`
            UPDATE transaction_records SET
                line_unloading_amount = ?,
                line_berthing_fee = ?
            WHERE id = ?
        `).run(lineUnloading, lineBerthing, rec.id);

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

    db.prepare(`
        UPDATE transactions SET
            total_tubs = ?, unloading_amount = ?, berthing_amount = ?, total_vat = ?, grand_total = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(totalTubs, unloadingAmount, berthingAmount, totalVat, grandTotal, txId);
}

router.post('/transfer-record', (req, res) => {
    const { record_id, target_transaction_id, target_client_name, target_date } = req.body;

    if (!record_id) {
        return res.status(400).json({ error: 'Record ID is required' });
    }

    try {
        const record: any = db.prepare('SELECT * FROM transaction_records WHERE id = ?').get(record_id);
        if (!record) {
            return res.status(404).json({ error: 'Transaction record not found' });
        }

        const sourceTxId = record.transaction_id;
        const sourceTx: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(sourceTxId);
        if (sourceTx && sourceTx.status === 'PAID') {
            return res.status(403).json({ error: 'Cannot transfer record from a PAID transaction' });
        }

        let destinationTxId = target_transaction_id;

        const performTransfer = db.transaction(() => {
            if (!destinationTxId && target_client_name) {
                const rows = db.prepare('SELECT key, value FROM settings').all();
                const settings: any = rows.reduce((acc: any, row: any) => {
                    acc[row.key] = row.value;
                    return acc;
                }, {});

                const pricePerTub = parseFloat(settings.price_per_tub || '0');
                const berthingFee = parseFloat(settings.berthing_fee || '0');
                const vatEnabled = settings.vat_enabled === '1' || settings.vat_enabled === 'true';
                const vatRate = parseFloat(settings.vat_rate || '0.12');
                const transactionNumber = generateTransactionNumber();

                const insertTx = db.prepare(`
                    INSERT INTO transactions (
                        transaction_number, transaction_date, client_name,
                        price_per_tub, berthing_fee_per_vessel,
                        vat_enabled, vat_rate,
                        total_tubs, unloading_amount, berthing_amount,
                        total_vat, grand_total, status
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 'UNPAID'
                    )
                `);

                const txResult = insertTx.run(
                    transactionNumber,
                    target_date || new Date().toISOString().split('T')[0],
                    target_client_name.trim().toUpperCase(),
                    pricePerTub,
                    berthingFee,
                    vatEnabled ? 1 : 0,
                    vatRate
                );
                destinationTxId = txResult.lastInsertRowid;
            }

            if (!destinationTxId) {
                throw new Error('Target transaction or client name is required');
            }

            const targetTx: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(destinationTxId);
            if (!targetTx) {
                throw new Error('Target transaction not found');
            }
            if (targetTx.status === 'PAID') {
                throw new Error('Cannot transfer record to a PAID transaction');
            }

            db.prepare('UPDATE transaction_records SET transaction_id = ? WHERE id = ?').run(destinationTxId, record_id);

            recalculateTxTotals(sourceTxId);
            recalculateTxTotals(destinationTxId);

            return destinationTxId;
        });

        const newTxId = performTransfer();
        res.json({ success: true, target_transaction_id: newTxId });

    } catch (err: any) {
        console.error('Transfer record error:', err);
        res.status(500).json({ error: err.message || 'Failed to transfer record' });
    }
});

export default router;
