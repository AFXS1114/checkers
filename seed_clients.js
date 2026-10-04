const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'backend', 'data', 'fish_unloading.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL COLLATE NOCASE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

const clients = [
  'ABI FISH DEALER', 'ADONIS FISH BROKER', 'AHL MARINE PRODUCTS TRADING', 'ALFRED FISH BROKER',
  'ALDIN A. BARTOLATA', 'AHL FISH BROKER', 'ALJUN FISH TRADER', 'J-A FISH BROKER',
  'VAL FISH TRADING', 'ALVIN FISH TRADING', 'ANDREW FISH BROKER', 'ANNABELLE M. GRUTAS',
  'AGS FISH BROKER', 'ARNIE FISH BROKER', 'ARNULFO FISH BROKER', 'ERAP VILAVIANO',
  'SMALL BROOKER', 'RMM/BRYAN', 'AKONG FISH BROKER', 'CHI-AM FISH TRADING',
  'JAI FISH TRADING', 'CHRISTIAN H. FRILLES', 'C.T FISH TRADING', 'DANDES RODRIGUEZ COMPANY',
  'DANILO B. MATAVERDE', 'DANILO DILAO GIMAO FISH BROKER', 'DANILO R. BARRUN', 'DANILO GICARO',
  'DARLO BRUCELO FISH BROKER', 'DOMINADOR GICARO FISH BROKER', 'JAD FISH BROKER', 'BUNSO FISH TRADING',
  'EDDIE R. HAYAHAY', 'EDISON P. METEORO II FISH BROKER', 'EDMAR JASARENO FISH DEALER',
  'PATRICK FISH DEALER', 'VEGA FISH TRADING', 'AMANTE', 'BOBBETH FISH TRADING',
  'PRINCE ERIC FISH BROKER', 'ERLINDA M. LISTA', 'MARK FISH BROKER', 'ERNESTO FISH TRADING',
  'FE FISH TRADER', 'DABALABS FISH SELLER'
];

const stmt = db.prepare('INSERT OR IGNORE INTO clients (name) VALUES (?)');
const insertAll = db.transaction((names) => {
  for (const n of names) stmt.run(n);
});
insertAll(clients);

const count = db.prepare('SELECT COUNT(*) as c FROM clients').get();
console.log('Total clients in DB:', count.c);

const all = db.prepare('SELECT name FROM clients ORDER BY name ASC').all();
all.forEach(r => console.log(' -', r.name));

db.close();
