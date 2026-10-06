CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

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
    tbf_number TEXT,
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
    tbf_number TEXT,
    FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL COLLATE NOCASE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed client list
INSERT OR IGNORE INTO clients (name) VALUES ('ABI FISH DEALER');
INSERT OR IGNORE INTO clients (name) VALUES ('ADONIS FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('AHL MARINE PRODUCTS TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('ALFRED FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('ALDIN A. BARTOLATA');
INSERT OR IGNORE INTO clients (name) VALUES ('AHL FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('ALJUN FISH TRADER');
INSERT OR IGNORE INTO clients (name) VALUES ('J-A FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('VAL FISH TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('ALVIN FISH TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('ANDREW FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('ANNABELLE M. GRUTAS');
INSERT OR IGNORE INTO clients (name) VALUES ('AGS FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('ARNIE FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('ARNULFO FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('ERAP VILAVIANO');
INSERT OR IGNORE INTO clients (name) VALUES ('SMALL BROOKER');
INSERT OR IGNORE INTO clients (name) VALUES ('RMM/BRYAN');
INSERT OR IGNORE INTO clients (name) VALUES ('AKONG FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('CHI-AM FISH TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('JAI FISH TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('CHRISTIAN H. FRILLES');
INSERT OR IGNORE INTO clients (name) VALUES ('C.T FISH TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('DANDES RODRIGUEZ COMPANY');
INSERT OR IGNORE INTO clients (name) VALUES ('DANILO B. MATAVERDE');
INSERT OR IGNORE INTO clients (name) VALUES ('DANILO DILAO GIMAO FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('DANILO R. BARRUN');
INSERT OR IGNORE INTO clients (name) VALUES ('DANILO GICARO');
INSERT OR IGNORE INTO clients (name) VALUES ('DARLO BRUCELO FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('DOMINADOR GICARO FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('JAD FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('BUNSO FISH TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('EDDIE R. HAYAHAY');
INSERT OR IGNORE INTO clients (name) VALUES ('EDISON P. METEORO II FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('EDMAR JASARENO FISH DEALER');
INSERT OR IGNORE INTO clients (name) VALUES ('PATRICK FISH DEALER');
INSERT OR IGNORE INTO clients (name) VALUES ('VEGA FISH TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('AMANTE');
INSERT OR IGNORE INTO clients (name) VALUES ('BOBBETH FISH TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('PRINCE ERIC FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('ERLINDA M. LISTA');
INSERT OR IGNORE INTO clients (name) VALUES ('MARK FISH BROKER');
INSERT OR IGNORE INTO clients (name) VALUES ('ERNESTO FISH TRADING');
INSERT OR IGNORE INTO clients (name) VALUES ('FE FISH TRADER');
INSERT OR IGNORE INTO clients (name) VALUES ('DABALABS FISH SELLER');

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if they don't exist
INSERT OR IGNORE INTO settings (key, value) VALUES ('price_per_tub', '25.00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('berthing_fee', '20.00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('vat_enabled', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('vat_rate', '0.12');
INSERT OR IGNORE INTO settings (key, value) VALUES ('company_name', 'Fish Unloading Co.');
INSERT OR IGNORE INTO settings (key, value) VALUES ('company_address', '123 Harbor Street');
INSERT OR IGNORE INTO settings (key, value) VALUES ('contact_number', '555-0100');
INSERT OR IGNORE INTO settings (key, value) VALUES ('print_col_date', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('print_col_vessel', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('print_col_specie', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('print_col_tubs', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('print_col_amount', '1');

