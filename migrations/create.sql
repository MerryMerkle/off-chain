CREATE TABLE donations (
    id SERIAL PRIMARY KEY,
    donor VARCHAR(50),
    value NUMERIC(80),
    tx_hash TEXT,
    created_at TIMESTAMP
);

CREATE TABLE aggregate_donations (
    donor VARCHAR(50) PRIMARY KEY,
    value NUMERIC(80),
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX top_aggregate_donations on aggregate_donations (value);

CREATE TABLE names (
    donor VARCHAR(50) PRIMARY KEY NOT NULL,
    name TEXT NOT NULL
);

CREATE INDEX donor_idx on names (donor);

CREATE TABLE total_donations (
    id INTEGER PRIMARY KEY,
    value NUMERIC(80)
);

INSERT INTO total_donations (id, value) VALUES (0, 0);

CREATE TABLE tiers (
    id INTEGER NOT NULL PRIMARY KEY,
    value INTEGER,
    reached INTEGER DEFAULT 0
);

INSERT INTO tiers (id, value) VALUES (1, 7500), (2, 15000), (3, 25000);