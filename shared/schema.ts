import { pgTable, text, serial, integer, varchar, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define role enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'guru', 'siswa']);

// Settings table for school and certificate data
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  schoolName: varchar("school_name", { length: 200 }).notNull().default("SMA Negeri 1"),
  schoolAddress: text("school_address").notNull().default("Jl. Pendidikan No. 1"),
  schoolEmail: varchar("school_email", { length: 100 }).default(""),
  schoolWebsite: varchar("school_website", { length: 100 }).default(""),
  schoolLogo: text("school_logo").default(""),
  ministryLogo: text("ministry_logo").default(""),
  headmasterName: varchar("headmaster_name", { length: 100 }).notNull().default("Drs. Kepala Sekolah"),
  headmasterNip: varchar("headmaster_nip", { length: 50 }).notNull().default("19700101 199001 1 001"),
  headmasterSignature: text("headmaster_signature").default(""),
  schoolStamp: text("school_stamp").default(""),
  certHeader: varchar("cert_header", { length: 200 }).notNull().default("SURAT KETERANGAN LULUS"),
  certFooter: text("cert_footer").notNull().default("Surat ini berlaku sebagai bukti kelulusan sampai ijazah diterbitkan."),
  certBeforeStudentData: text("cert_before_student_data").notNull().default("Yang bertanda tangan di bawah ini, Kepala Sekolah Menengah Atas, menerangkan bahwa:"),
  certAfterStudentData: text("cert_after_student_data").notNull().default("telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan."),
  certNumberPrefix: varchar("cert_number_prefix", { length: 50 }).default(""),
  certRegulationText: text("cert_regulation_text").default(""),
  certCriteriaText: text("cert_criteria_text").default(""),
  academicYear: varchar("academic_year", { length: 20 }).notNull().default("2023/2024"),
  graduationDate: varchar("graduation_date", { length: 30 }).default(""),
  graduationTime: varchar("graduation_time", { length: 20 }).default(""),
  cityName: varchar("city_name", { length: 100 }).default(""),
  provinceName: varchar("province_name", { length: 100 }).default(""),
  majorList: text("major_list").default("semua,MIPA,IPS,BAHASA"),
  classList: text("class_list").default("XII IPA 1,XII IPA 2,XII IPS 1,XII IPS 2"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  hasSeenWelcome: boolean("has_seen_welcome").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student grades table
export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  subjectName: varchar("subject_name", { length: 100 }).notNull(),
  value: integer("value").notNull(),
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
  hasSeenWelcome: true,
  createdAt: true
});

// Customize insert schema for settings to make most fields optional except required ones
export const insertSettingsSchema = createInsertSchema(settings)
  .omit({
    id: true,
    updatedAt: true
  })
  .extend({
    // Keep required fields
    schoolName: z.string().min(1, "School name is required"),
    schoolAddress: z.string().min(1, "School address is required"),
    headmasterName: z.string().min(1, "Headmaster name is required"),
    headmasterNip: z.string().min(1, "Headmaster NIP is required"),
    academicYear: z.string().min(1, "Academic year is required"),
    
    // Make all other fields optional with proper defaults
    schoolEmail: z.string().optional().default(""),
    schoolWebsite: z.string().optional().default(""),
    schoolLogo: z.string().optional().default(""),
    ministryLogo: z.string().optional().default(""),
    headmasterSignature: z.string().optional().default(""),
    schoolStamp: z.string().optional().default(""),
    certHeader: z.string().optional().default("SURAT KETERANGAN LULUS"),
    certFooter: z.string().optional().default("Surat ini berlaku sebagai bukti kelulusan sampai ijazah diterbitkan."),
    certBeforeStudentData: z.string().optional().default("Yang bertanda tangan di bawah ini, Kepala Sekolah Menengah Atas, menerangkan bahwa:"),
    certAfterStudentData: z.string().optional().default("telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan."),
    certNumberPrefix: z.string().optional().default(""),
    certRegulationText: z.string().optional().default(""),
    certCriteriaText: z.string().optional().default(""),
    graduationDate: z.string().optional().default(""),
    graduationTime: z.string().optional().default(""),
    cityName: z.string().optional().default(""),
    provinceName: z.string().optional().default(""),
    majorList: z.string().optional().default("semua,MIPA,IPS,BAHASA"),
    classList: z.string().optional().default("XII IPA 1,XII IPA 2,XII IPS 1,XII IPS 2")
  });

export const insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
  createdAt: true
});

// Define types
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Grade = typeof grades.$inferSelect;

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

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  group: varchar("group", { length: 20 }).notNull(), // Kelompok (A, B, C)
  credits: integer("credits").notNull(), // No Urut
  major: varchar("major", { length: 50 }).default("semua"), // Jurusan (semua, MIPA, IPS, dll)
  status: varchar("status", { length: 20 }).notNull().default("aktif"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define insert schema for subjects
export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true
});

// Define types for subjects
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;
