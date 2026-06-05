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
      attachment_name TEXT,
      attachment_type TEXT,
      attachment_data TEXT,
      quote_message_id TEXT,
      quote_sender_name TEXT,
      quote_body TEXT,
      recalled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_deletions (
      message_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS food_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planned_date TEXT NOT NULL,
      dish_name TEXT NOT NULL,
      bought_at TEXT,
      created_by_id TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedule_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planned_date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  for (const statement of [
    "ALTER TABLE messages ADD COLUMN attachment_name TEXT",
    "ALTER TABLE messages ADD COLUMN attachment_type TEXT",
    "ALTER TABLE messages ADD COLUMN attachment_data TEXT",
    "ALTER TABLE messages ADD COLUMN quote_message_id TEXT",
    "ALTER TABLE messages ADD COLUMN quote_sender_name TEXT",
    "ALTER TABLE messages ADD COLUMN quote_body TEXT",
    "ALTER TABLE messages ADD COLUMN recalled_at TEXT",
  ]) {
    try {
      db.exec(statement);
    } catch {}
  }

  const selectMessages = db.prepare(`
    SELECT id,
           sender_id AS senderId,
           sender_name AS senderName,
           body,
           attachment_name AS attachmentName,
           attachment_type AS attachmentType,
           attachment_data AS attachmentData,
           quote_message_id AS quoteMessageId,
           quote_sender_name AS quoteSenderName,
           quote_body AS quoteBody,
           recalled_at AS recalledAt,
           created_at AS createdAt
    FROM messages
    WHERE id NOT IN (SELECT message_id FROM message_deletions WHERE user_id = ?)
    ORDER BY id DESC
    LIMIT ?
  `);
  const insertMessage = db.prepare(`
    INSERT INTO messages (
      sender_id, sender_name, body, attachment_name, attachment_type, attachment_data,
      quote_message_id, quote_sender_name, quote_body
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const selectMessage = db.prepare(`
    SELECT id,
           sender_id AS senderId,
           sender_name AS senderName,
           body,
           attachment_name AS attachmentName,
           attachment_type AS attachmentType,
           attachment_data AS attachmentData,
           quote_message_id AS quoteMessageId,
           quote_sender_name AS quoteSenderName,
           quote_body AS quoteBody,
           recalled_at AS recalledAt,
           created_at AS createdAt
    FROM messages
    WHERE id = ?
  `);
  const recallMessage = db.prepare(`
    UPDATE messages
    SET recalled_at = datetime('now'), body = '', attachment_name = NULL, attachment_type = NULL, attachment_data = NULL
    WHERE id = ? AND sender_id = ? AND recalled_at IS NULL
  `);
  const deleteMessage = db.prepare(`
    INSERT OR IGNORE INTO message_deletions (message_id, user_id)
    VALUES (?, ?)
  `);
  const clearAllMessages = db.transaction(() => {
    db.prepare("DELETE FROM message_deletions").run();
    db.prepare("DELETE FROM messages").run();
  });
  const selectFoodItems = db.prepare(`
    SELECT id,
           planned_date AS plannedDate,
           dish_name AS dishName,
           bought_at AS boughtAt,
           created_by_id AS createdById,
           created_by_name AS createdByName,
           created_at AS createdAt
    FROM food_items
    ORDER BY planned_date ASC, id ASC
  `);
  const insertFoodItem = db.prepare(`
    INSERT INTO food_items (planned_date, dish_name, created_by_id, created_by_name)
    VALUES (?, ?, ?, ?)
  `);
  const selectFoodItem = db.prepare(`
    SELECT id,
           planned_date AS plannedDate,
           dish_name AS dishName,
           bought_at AS boughtAt,
           created_by_id AS createdById,
           created_by_name AS createdByName,
           created_at AS createdAt
    FROM food_items
    WHERE id = ?
  `);
  const updateFoodItemBought = db.prepare(`
    UPDATE food_items
    SET bought_at = CASE WHEN ? THEN datetime('now') ELSE NULL END
    WHERE id = ?
  `);
  const deleteFoodItem = db.prepare("DELETE FROM food_items WHERE id = ?");
  const deleteFoodItemsByDate = db.prepare("DELETE FROM food_items WHERE planned_date = ?");
  const selectScheduleItems = db.prepare(`
    SELECT id,
           planned_date AS plannedDate,
           content,
           created_by_id AS createdById,
           created_by_name AS createdByName,
           created_at AS createdAt
    FROM schedule_items
    ORDER BY planned_date ASC, id ASC
  `);
  const insertScheduleItem = db.prepare(`
    INSERT INTO schedule_items (planned_date, content, created_by_id, created_by_name)
    VALUES (?, ?, ?, ?)
  `);
  const selectScheduleItem = db.prepare(`
    SELECT id,
           planned_date AS plannedDate,
           content,
           created_by_id AS createdById,
           created_by_name AS createdByName,
           created_at AS createdAt
    FROM schedule_items
    WHERE id = ?
  `);
  const deleteScheduleItem = db.prepare("DELETE FROM schedule_items WHERE id = ?");

  return {
    async init() {},
    async listMessages(userId, limit) {
      return selectMessages.all(userId, limit).reverse();
    },
    async createMessage(user, body, attachment, quote) {
      const result = insertMessage.run(
        user.id,
        user.displayName,
        body,
        attachment?.name || null,
        attachment?.type || null,
        attachment?.data || null,
        quote?.messageId || null,
        quote?.senderName || null,
        quote?.body || null
      );
      return selectMessage.get(result.lastInsertRowid);
    },
    async recallMessage(user, messageId) {
      const result = recallMessage.run(messageId, user.id);
      return result.changes ? selectMessage.get(messageId) : null;
    },
    async deleteMessage(user, messageId) {
      deleteMessage.run(messageId, user.id);
      return { id: String(messageId), userId: user.id };
    },
    async clearAllMessages() {
      clearAllMessages();
    },
    async listFoodItems() {
      return selectFoodItems.all();
    },
    async createFoodItem(user, plannedDate, dishName) {
      const result = insertFoodItem.run(plannedDate, dishName, user.id, user.displayName);
      return selectFoodItem.get(result.lastInsertRowid);
    },
    async updateFoodItemBought(id, bought) {
      updateFoodItemBought.run(bought ? 1 : 0, id);
      return selectFoodItem.get(id);
    },
    async deleteFoodItem(id) {
      const item = selectFoodItem.get(id);
      deleteFoodItem.run(id);
      return item || null;
    },
    async deleteFoodItemsByDate(plannedDate) {
      const result = deleteFoodItemsByDate.run(plannedDate);
      return result.changes;
    },
    async listScheduleItems() {
      return selectScheduleItems.all();
    },
    async createScheduleItem(user, plannedDate, content) {
      const result = insertScheduleItem.run(plannedDate, content, user.id, user.displayName);
      return selectScheduleItem.get(result.lastInsertRowid);
    },
    async deleteScheduleItem(id) {
      const item = selectScheduleItem.get(id);
      deleteScheduleItem.run(id);
      return item || null;
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
          attachment_name TEXT,
          attachment_type TEXT,
          attachment_data TEXT,
          quote_message_id TEXT,
          quote_sender_name TEXT,
          quote_body TEXT,
          recalled_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS message_deletions (
          message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (message_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS food_items (
          id BIGSERIAL PRIMARY KEY,
          planned_date DATE NOT NULL,
          dish_name TEXT NOT NULL,
          bought_at TIMESTAMPTZ,
          created_by_id TEXT NOT NULL,
          created_by_name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS schedule_items (
          id BIGSERIAL PRIMARY KEY,
          planned_date DATE NOT NULL,
          content TEXT NOT NULL,
          created_by_id TEXT NOT NULL,
          created_by_name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        ALTER TABLE messages
          ADD COLUMN IF NOT EXISTS attachment_name TEXT,
          ADD COLUMN IF NOT EXISTS attachment_type TEXT,
          ADD COLUMN IF NOT EXISTS attachment_data TEXT,
          ADD COLUMN IF NOT EXISTS quote_message_id TEXT,
          ADD COLUMN IF NOT EXISTS quote_sender_name TEXT,
          ADD COLUMN IF NOT EXISTS quote_body TEXT,
          ADD COLUMN IF NOT EXISTS recalled_at TIMESTAMPTZ;
      `);
    },
    async listMessages(userId, limit) {
      const result = await pool.query(
        `SELECT id::text AS "id",
                sender_id AS "senderId",
                sender_name AS "senderName",
                body,
                attachment_name AS "attachmentName",
                attachment_type AS "attachmentType",
                attachment_data AS "attachmentData",
                quote_message_id AS "quoteMessageId",
                quote_sender_name AS "quoteSenderName",
                quote_body AS "quoteBody",
                recalled_at AS "recalledAt",
                created_at AS "createdAt"
         FROM messages
         WHERE id NOT IN (
           SELECT message_id FROM message_deletions WHERE user_id = $1
         )
         ORDER BY id DESC
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows.reverse();
    },
    async createMessage(user, body, attachment, quote) {
      const result = await pool.query(
        `INSERT INTO messages (
           sender_id, sender_name, body, attachment_name, attachment_type, attachment_data,
           quote_message_id, quote_sender_name, quote_body
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id::text AS "id",
                   sender_id AS "senderId",
                   sender_name AS "senderName",
                   body,
                   attachment_name AS "attachmentName",
                   attachment_type AS "attachmentType",
                   attachment_data AS "attachmentData",
                   quote_message_id AS "quoteMessageId",
                   quote_sender_name AS "quoteSenderName",
                   quote_body AS "quoteBody",
                   recalled_at AS "recalledAt",
                   created_at AS "createdAt"`,
        [
          user.id,
          user.displayName,
          body,
          attachment?.name || null,
          attachment?.type || null,
          attachment?.data || null,
          quote?.messageId || null,
          quote?.senderName || null,
          quote?.body || null,
        ]
      );
      return result.rows[0];
    },
    async recallMessage(user, messageId) {
      const result = await pool.query(
        `UPDATE messages
         SET recalled_at = NOW(),
             body = '',
             attachment_name = NULL,
             attachment_type = NULL,
             attachment_data = NULL
         WHERE id = $1 AND sender_id = $2 AND recalled_at IS NULL
         RETURNING id::text AS "id",
                   sender_id AS "senderId",
                   sender_name AS "senderName",
                   body,
                   attachment_name AS "attachmentName",
                   attachment_type AS "attachmentType",
                   attachment_data AS "attachmentData",
                   quote_message_id AS "quoteMessageId",
                   quote_sender_name AS "quoteSenderName",
                   quote_body AS "quoteBody",
                   recalled_at AS "recalledAt",
                   created_at AS "createdAt"`,
        [messageId, user.id]
      );
      return result.rows[0] || null;
    },
    async deleteMessage(user, messageId) {
      await pool.query(
        `INSERT INTO message_deletions (message_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [messageId, user.id]
      );
      return { id: String(messageId), userId: user.id };
    },
    async clearAllMessages() {
      await pool.query("DELETE FROM message_deletions");
      await pool.query("DELETE FROM messages");
    },
    async listFoodItems() {
      const result = await pool.query(
        `SELECT id::text AS "id",
                to_char(planned_date, 'YYYY-MM-DD') AS "plannedDate",
                dish_name AS "dishName",
                bought_at AS "boughtAt",
                created_by_id AS "createdById",
                created_by_name AS "createdByName",
                created_at AS "createdAt"
         FROM food_items
         ORDER BY planned_date ASC, id ASC`
      );
      return result.rows;
    },
    async createFoodItem(user, plannedDate, dishName) {
      const result = await pool.query(
        `INSERT INTO food_items (planned_date, dish_name, created_by_id, created_by_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id::text AS "id",
                   to_char(planned_date, 'YYYY-MM-DD') AS "plannedDate",
                   dish_name AS "dishName",
                   bought_at AS "boughtAt",
                   created_by_id AS "createdById",
                   created_by_name AS "createdByName",
                   created_at AS "createdAt"`,
        [plannedDate, dishName, user.id, user.displayName]
      );
      return result.rows[0];
    },
    async updateFoodItemBought(id, bought) {
      const result = await pool.query(
        `UPDATE food_items
         SET bought_at = CASE WHEN $2 THEN NOW() ELSE NULL END
         WHERE id = $1
         RETURNING id::text AS "id",
                   to_char(planned_date, 'YYYY-MM-DD') AS "plannedDate",
                   dish_name AS "dishName",
                   bought_at AS "boughtAt",
                   created_by_id AS "createdById",
                   created_by_name AS "createdByName",
                   created_at AS "createdAt"`,
        [id, Boolean(bought)]
      );
      return result.rows[0] || null;
    },
    async deleteFoodItem(id) {
      const result = await pool.query(
        `DELETE FROM food_items
         WHERE id = $1
         RETURNING id::text AS "id"`,
        [id]
      );
      return result.rows[0] || null;
    },
    async deleteFoodItemsByDate(plannedDate) {
      const result = await pool.query(
        `DELETE FROM food_items
         WHERE planned_date = $1`,
        [plannedDate]
      );
      return result.rowCount;
    },
    async listScheduleItems() {
      const result = await pool.query(
        `SELECT id::text AS "id",
                to_char(planned_date, 'YYYY-MM-DD') AS "plannedDate",
                content,
                created_by_id AS "createdById",
                created_by_name AS "createdByName",
                created_at AS "createdAt"
         FROM schedule_items
         ORDER BY planned_date ASC, id ASC`
      );
      return result.rows;
    },
    async createScheduleItem(user, plannedDate, content) {
      const result = await pool.query(
        `INSERT INTO schedule_items (planned_date, content, created_by_id, created_by_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id::text AS "id",
                   to_char(planned_date, 'YYYY-MM-DD') AS "plannedDate",
                   content,
                   created_by_id AS "createdById",
                   created_by_name AS "createdByName",
                   created_at AS "createdAt"`,
        [plannedDate, content, user.id, user.displayName]
      );
      return result.rows[0];
    },
    async deleteScheduleItem(id) {
      const result = await pool.query(
        `DELETE FROM schedule_items
         WHERE id = $1
         RETURNING id::text AS "id"`,
        [id]
      );
      return result.rows[0] || null;
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
