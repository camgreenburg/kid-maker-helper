import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  type: text("type").notNull(), // 'text' | 'clarify' | 'video'
  content: text("content"), // text message or question
  imageUrl: text("image_url"), // for user uploads
  metadata: jsonb("metadata"), // for choices, video details, alternates
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatSchema = createInsertSchema(chats).omit({ id: true, createdAt: true });

export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;

// Helper types for metadata structure
export type VideoMetadata = {
  videoId: string;
  startSeconds?: number;
  title: string;
  why?: string;
};

export type ChatMetadata = {
  choices?: string[];
  video?: VideoMetadata;
  alternates?: VideoMetadata[];
};

export type SendMessageRequest = {
  sessionId: string;
  text?: string;
  image?: string; // base64
};
