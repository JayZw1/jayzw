const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { Pool } = require("pg");

function createSqliteStore(databasePath) {
  const dbFile = path.resolve(databasePath || "./data/chat.sqlite");
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });

  const db = new Database(dbFile);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const selectMessages = db.prepare(`
    SELECT id, sender_id AS senderId, sender_name AS senderName, body, created_at AS createdAt
    FROM messages
    ORDER BY id DESC
    LIMIT ?
  `);
  const insertMessage = db.prepare(`
    INSERT INTO messages (sender_id, sender_name, body)
    VALUES (?, ?, ?)
  `);
  const selectMessage = db.prepare(`
    SELECT id, sender_id AS senderId, sender_name AS senderName, body, created_at AS createdAt
    FROM messages
    WHERE id = ?
  `);

  return {
    async init() {},
    async listMessages(limit) {
      return selectMessages.all(limit).reverse();
    },
    async createMessage(user, body) {
      const result = insertMessage.run(user.id, user.displayName, body);
      return selectMessage.get(result.lastInsertRowid);
    },
  };
}

function createPostgresStore(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  return {
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id BIGSERIAL PRIMARY KEY,
          sender_id TEXT NOT NULL,
          sender_name TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    },
    async listMessages(limit) {
      const result = await pool.query(
        `SELECT id::text AS "id",
                sender_id AS "senderId",
                sender_name AS "senderName",
                body,
                created_at AS "createdAt"
         FROM messages
         ORDER BY id DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows.reverse();
    },
    async createMessage(user, body) {
      const result = await pool.query(
        `INSERT INTO messages (sender_id, sender_name, body)
         VALUES ($1, $2, $3)
         RETURNING id::text AS "id",
                   sender_id AS "senderId",
                   sender_name AS "senderName",
                   body,
                   created_at AS "createdAt"`,
        [user.id, user.displayName, body]
      );
      return result.rows[0];
    },
  };
}

function createStore() {
  if (process.env.DATABASE_URL) {
    return createPostgresStore(process.env.DATABASE_URL);
  }

  return createSqliteStore(process.env.DATABASE_PATH);
}

module.exports = { createStore };
