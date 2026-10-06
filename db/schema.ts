import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
});
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
  expiresAt: integer('expires_at').notNull(),
}, table=>[index('sessions_expiry').on(table.expiresAt)]);
export const attempts = sqliteTable('auth_attempts', {
  key: text('key').primaryKey(), count: integer('count').notNull(), resetAt: integer('reset_at').notNull(),
});
export const merchantRules = sqliteTable('merchant_rules', {
  userId: text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
  merchantKey: text('merchant_key').notNull(),
  merchantName: text('merchant_name').notNull(),
  category: text('category').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table=>[primaryKey({columns:[table.userId,table.merchantKey]})]);
