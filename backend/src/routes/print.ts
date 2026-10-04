import express from 'express';
import db from '../db';


let escpos: any = null;
try {
    escpos = require('escpos');
    const escposUsb = require('escpos-usb');
    escpos.USB = escposUsb;
} catch (e) {
    console.warn('[print] escpos/escpos-usb not available. Print will run in simulation mode.');
}

const router = express.Router();

function padRight(str: string, length: number) {
    if (str.length >= length) return str.substring(0, length);
    return str + ' '.repeat(length - str.length);
}

function padLeft(str: string, length: number) {
    if (str.length >= length) return str.substring(0, length);
    return ' '.repeat(length - str.length) + str;
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const y = d.getFullYear();
    return `${m}/${day}/${y}`;
}

function formatShortDate(dateStr: string) {
    const d = new Date(dateStr);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${m}/${day}`;
}

function formatDateTime(dateStr: string | number) {
    const d = new Date(dateStr);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const y = d.getFullYear();
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${m}/${day}/${y} ${h}:${min}:${sec}`;
}

router.post('/:id', (req, res) => {
    try {
        const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as any;
        if (!tx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const records = db.prepare('SELECT * FROM transaction_records WHERE transaction_id = ?').all(req.params.id) as any[];
        
        const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
        const settings = settingsRows.reduce((acc: any, row: any) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        let device;
        try {
             device = new escpos.USB();
        } catch (e) {
             console.log('No USB printer found or driver missing. Continuing in dummy mode for testing.');
             return res.json({ success: true, message: 'Simulated print success (no printer found)' });
        }
        
        const printer = new escpos.Printer(device);

        device.open((err: any) => {
            if (err) {
                console.error('Error opening device:', err);
                return res.status(500).json({ error: 'Failed to open printer' });
            }

            const printDate = formatDateTime(Date.now());
            const txDate = formatDate(tx.transaction_date);
            const line = '-'.repeat(40);

            printer
                .font('a')
                .align('ct')
                .style('b')
                .text(settings.company_name || 'COMPANY NAME')
                .style('normal')
                .text(settings.company_address || '')
                .text(settings.contact_number || '')
                .feed(1)
                
                .style('b')
                .text('UNLOADING FEE')
                .style('normal')
                .feed(1)
                .align('lt')
                .text(`Date: ${txDate}`)
                .text(`Client: ${tx.client_name}`)
                .feed(1);

            const showDate = settings.print_col_date !== '0';
            const showVessel = settings.print_col_vessel !== '0';
            const showSpecie = settings.print_col_specie !== '0';
            const showTubs = settings.print_col_tubs !== '0';
            const showAmount = settings.print_col_amount !== '0';

            const activeCols: { key: string; header: string; width: number; align: 'left' | 'right' }[] = [];
            if (showDate) activeCols.push({ key: 'date', header: 'DATE', width: 5, align: 'left' });
            if (showVessel) activeCols.push({ key: 'vessel', header: 'VESSEL', width: 12, align: 'left' });
            if (showSpecie) activeCols.push({ key: 'specie', header: 'SPECIE', width: 8, align: 'left' });
            if (showTubs) activeCols.push({ key: 'tubs', header: 'TUBS', width: 5, align: 'right' });
            if (showAmount) activeCols.push({ key: 'amount', header: 'AMOUNT', width: 9, align: 'right' });

            if (activeCols.length > 0) {
                const headerLine = activeCols.map(c => c.align === 'right' ? padLeft(c.header, c.width) : padRight(c.header, c.width)).join(' ');
                printer
                    .text(line)
                    .text(headerLine)
                    .text(line);

                records.forEach(r => {
                    const rowStr = activeCols.map(c => {
                        let val = '';
                        if (c.key === 'date') val = formatShortDate(r.arrival_date);
                        else if (c.key === 'vessel') val = r.vessel_name || '';
                        else if (c.key === 'specie') val = r.species || '';
                        else if (c.key === 'tubs') val = r.tubs.toString();
                        else if (c.key === 'amount') val = r.line_unloading_amount.toFixed(2);

                        return c.align === 'right' ? padLeft(val, c.width) : padRight(val, c.width);
                    }).join(' ');
                    printer.text(rowStr);
                });
            } else {
                printer
                    .text(line)
                    .text('NO COLUMNS SELECTED')
                    .text(line);
            }

            printer
                .text(line)
                .text(`Total Tubs ................. ${padLeft(tx.total_tubs.toString(), 10)}`)
                .text(`Amount Due ................. ${padLeft(tx.unloading_amount.toFixed(2), 10)}`)
                .text(`VAT Amount ................. ${padLeft((tx.vat_enabled ? tx.unloading_amount * tx.vat_rate : 0).toFixed(2), 10)}`)
                .text(`Total Amount Due ........... ${padLeft((tx.unloading_amount + (tx.vat_enabled ? tx.unloading_amount * tx.vat_rate : 0)).toFixed(2), 10)}`)
                .text(line)
                .align('ct')
                .text(`Printed: ${printDate}`)
                .feed(4)
                .cut()

            const berthingRecords = records.filter(r => r.line_berthing_fee > 0 || (r.grt && r.grt > 0));

            if (berthingRecords.length > 0) {
                printer
                    .align('ct')
                    .style('b')
                    .text(settings.company_name || 'COMPANY NAME')
                    .style('normal')
                    .text(settings.company_address || '')
                    .text(settings.contact_number || '')
                    .feed(1)
                    .style('b')
                    .text('BERTHING FEE')
                    .style('normal')
                    .feed(1)
                    .align('lt')
                    .text(`Date: ${txDate}`)
                    .text(`Client: ${tx.client_name}`)
                    .feed(1)
                    .text(line)
                    .text('DATE     VESSEL                   FEE')
                    .text(line);

                berthingRecords.forEach(r => {
                    const aDate = formatShortDate(r.arrival_date);
                    const vName = padRight(r.vessel_name, 20);
                    const amt = padLeft(r.line_berthing_fee.toFixed(2), 8);
                    
                    printer.text(`${aDate} ${vName} ${amt}`);
                });

                const vesselCount = berthingRecords.length;
                const berthingAmount = tx.berthing_amount;
                const berthingVat = tx.vat_enabled ? berthingAmount * tx.vat_rate : 0;
                const totalBerthing = berthingAmount + berthingVat;

                printer
                    .text(line)
                    .text(`Vessel Count ............... ${padLeft(vesselCount.toString(), 10)}`)
                    .text(`Amount Due ................. ${padLeft(berthingAmount.toFixed(2), 10)}`)
                    .text(`VAT Amount ................. ${padLeft(berthingVat.toFixed(2), 10)}`)
                    .text(`Total Amount Due ........... ${padLeft(totalBerthing.toFixed(2), 10)}`)
                    .text(line)
                    .align('ct')
                    .text(`Printed: ${printDate}`)
                    .feed(4)
                    .cut();
            }

            printer.close();
            res.json({ success: true });
        });

    } catch (err) {
        console.error('Print error:', err);
        res.status(500).json({ error: 'Failed to print' });
    }
});

export default router;
