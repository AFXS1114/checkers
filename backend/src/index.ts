import express from 'express';
import cors from 'cors';
import db from './db';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

import transactionsRouter from './routes/transactions';
import printRouter from './routes/print';
import backupRouter from './routes/backup';

app.use('/api/transactions', transactionsRouter);
app.use('/api/print', printRouter);
app.use('/api/db', backupRouter);


app.get('/api/settings', (req, res) => {
    try {
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = rows.reduce((acc: any, row: any) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

app.put('/api/settings', (req, res) => {
    try {
        const settings = req.body;
        const stmt = db.prepare('UPDATE settings SET value = @value WHERE key = @key');
        
        const updateSettings = db.transaction((settingsObj) => {
            for (const [key, value] of Object.entries(settingsObj)) {
                const info = stmt.run({ key, value: String(value) });
                if (info.changes === 0) {
                     db.prepare('INSERT INTO settings (key, value) VALUES (@key, @value)').run({ key, value: String(value) });
                }
            }
        });

        updateSettings(settings);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});


app.post('/api/clients/bulk', (req, res) => {
    try {
        const { names } = req.body as { names: string[] };
        if (!Array.isArray(names) || names.length === 0)
            return res.status(400).json({ error: 'names array is required' });

        const stmt = db.prepare('INSERT OR IGNORE INTO clients (name) VALUES (?)');
        let inserted = 0;
        let skipped = 0;

        const bulkInsert = db.transaction((list: string[]) => {
            for (const raw of list) {
                const name = raw.trim().toUpperCase();
                if (!name) continue;
                const info = stmt.run(name);
                if (info.changes > 0) inserted++;
                else skipped++;
            }
        });
        bulkInsert(names);

        res.json({ success: true, inserted, skipped, total: inserted + skipped });
    } catch (err) {
        res.status(500).json({ error: 'Failed to bulk import clients' });
    }
});

app.get('/api/clients', (req, res) => {
    try {
        const q = req.query.q as string | undefined;
        let rows;
        if (q && q.trim()) {
            rows = db.prepare(
                `SELECT id, name FROM clients WHERE name LIKE ? ORDER BY name ASC LIMIT 20`
            ).all(`%${q.trim()}%`);
        } else {
            rows = db.prepare(`SELECT id, name FROM clients ORDER BY name ASC`).all();
        }
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

app.post('/api/clients', (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
        const result = db.prepare('INSERT OR IGNORE INTO clients (name) VALUES (?)').run(name.trim().toUpperCase());
        res.json({ success: true, inserted: result.changes > 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add client' });
    }
});

app.delete('/api/clients/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete client' });
    }
});


app.get('/api/vessels/history', (req, res) => {
    try {
        const client = (req.query.client as string || '').trim();
        if (!client) return res.json([]);


        const rows = db.prepare(`
            SELECT tr.vessel_name, tr.grt, tr.species,
                   MAX(t.transaction_date) AS last_used
            FROM transaction_records tr
            JOIN transactions t ON t.id = tr.transaction_id
            WHERE UPPER(t.client_name) = UPPER(?)
            GROUP BY UPPER(tr.vessel_name)
            ORDER BY last_used DESC
            LIMIT 30
        `).all(client);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch vessel history' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
