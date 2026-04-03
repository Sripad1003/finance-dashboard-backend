const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');

const db = new Database(path.resolve(__dirname, '..', config.dbPath));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
