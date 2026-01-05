import { db } from "./db";
import {
  chats,
  type InsertChat,
  type Chat
} from "@shared/schema";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  createChat(chat: InsertChat): Promise<Chat>;
  getChats(sessionId: string): Promise<Chat[]>;
}

export class DatabaseStorage implements IStorage {
  async createChat(chat: InsertChat): Promise<Chat> {
    const [newChat] = await db.insert(chats).values(chat).returning();
    return newChat;
  }

  async getChats(sessionId: string): Promise<Chat[]> {
    return await db.select()
      .from(chats)
      .where(eq(chats.sessionId, sessionId))
      .orderBy(asc(chats.createdAt));
  }
}

export const storage = new DatabaseStorage();
