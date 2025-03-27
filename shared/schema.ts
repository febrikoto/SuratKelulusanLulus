import { pgTable, text, serial, integer, varchar, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define role enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'guru', 'siswa']);

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  nisn: varchar("nisn", { length: 20 }).notNull().unique(),
  nis: varchar("nis", { length: 20 }).notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  birthPlace: varchar("birth_place", { length: 100 }).notNull(),
  birthDate: varchar("birth_date", { length: 20 }).notNull(),
  parentName: varchar("parent_name", { length: 100 }).notNull(),
  className: varchar("class_name", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  verifiedBy: integer("verified_by").references(() => users.id),
  verificationDate: timestamp("verification_date"),
  verificationNotes: text("verification_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  role: userRoleEnum("role").notNull().default("siswa"),
  studentId: integer("student_id").references(() => students.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define insert schemas
export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  verifiedBy: true,
  verificationDate: true,
  verificationNotes: true,
  createdAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

// Define types
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "guru", "siswa"])
});

export type LoginData = z.infer<typeof loginSchema>;

// Verification schema
export const verificationSchema = z.object({
  studentId: z.number(),
  status: z.enum(["verified", "rejected"]),
  verificationNotes: z.string().optional()
});

export type VerificationData = z.infer<typeof verificationSchema>;
