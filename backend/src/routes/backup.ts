import express from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db';

const router = express.Router();

router.get('/backup', (req, res) => {
    try {
        const dbPath = path.join(__dirname, '..', '..', 'data', 'fish_unloading.db');
        const backupName = `backup_${Date.now()}.sqlite3`;
        const backupPath = path.join(__dirname, '..', '..', 'data', backupName);


        db.backup(backupPath)
            .then(() => {
                res.download(backupPath, backupName, (err) => {
                    if (err) console.error('Download error:', err);
                    try {
                        fs.unlinkSync(backupPath);
                    } catch (e) {
                        console.error('Unlink error:', e);
                    }
                });
            })
            .catch((err: any) => {
                console.error('Backup error:', err);
                res.status(500).json({ error: 'Backup failed' });
            });

    } catch (err) {
        console.error('Backup route error:', err);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});


export default router;
