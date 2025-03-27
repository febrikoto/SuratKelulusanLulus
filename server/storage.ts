import { User, Student, InsertUser, InsertStudent, VerificationData, students, users } from "@shared/schema";
import { DashboardStats } from "@shared/types";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import createMemoryStore from "memorystore";
import { eq, and, sql, count } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);
const scryptAsync = promisify(scrypt);

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Student operations
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByNisn(nisn: string): Promise<Student | undefined>;
  getStudents(query?: { status?: string; className?: string }): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;

  // Verification operations
  verifyStudent(verificationData: VerificationData, verifiedBy: number): Promise<Student | undefined>;
  
  // Dashboard operations
  getDashboardStats(): Promise<DashboardStats>;
  
  // Auth
  hashPassword(password: string): Promise<string>;
  comparePasswords(supplied: string, stored: string): Promise<boolean>;
  
  // Session
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  private db;
  sessionStore: any;
  private pool;

  constructor() {
    this.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    this.db = drizzle(this.pool);
    this.sessionStore = new PostgresSessionStore({ 
      pool: this.pool,
      createTableIfMissing: true
    });
    
    // Seed admin account
    this.seedAdmin();
  }

  private async seedAdmin() {
    const adminExists = await this.getUserByUsername('admin');
    if (!adminExists) {
      await this.createUser({
        username: 'admin',
        password: await this.hashPassword('admin123'),
        fullName: 'Admin Sekolah',
        role: 'admin',
        studentId: null
      });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(userData).returning();
    return result[0];
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const result = await this.db.select().from(students).where(eq(students.id, id));
    return result[0];
  }

  async getStudentByNisn(nisn: string): Promise<Student | undefined> {
    const result = await this.db.select().from(students).where(eq(students.nisn, nisn));
    return result[0];
  }

  async getStudents(query?: { status?: string; className?: string }): Promise<Student[]> {
    let query_builder = this.db.select().from(students);
    
    if (query) {
      if (query.status && query.className) {
        query_builder = query_builder.where(
          and(
            eq(students.status, query.status),
            eq(students.className, query.className)
          )
        );
      } else if (query.status) {
        query_builder = query_builder.where(eq(students.status, query.status));
      } else if (query.className) {
        query_builder = query_builder.where(eq(students.className, query.className));
      }
    }
    
    return await query_builder;
  }

  async createStudent(studentData: InsertStudent): Promise<Student> {
    const result = await this.db.insert(students).values(studentData).returning();
    return result[0];
  }

  async updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const result = await this.db.update(students)
      .set(data)
      .where(eq(students.id, id))
      .returning();
    
    return result[0];
  }

  async deleteStudent(id: number): Promise<boolean> {
    const result = await this.db.delete(students)
      .where(eq(students.id, id))
      .returning({ id: students.id });
    
    return result.length > 0;
  }

  async verifyStudent(verificationData: VerificationData, verifiedBy: number): Promise<Student | undefined> {
    const result = await this.db.update(students)
      .set({
        status: verificationData.status,
        verifiedBy: verifiedBy,
        verificationDate: new Date(),
        verificationNotes: verificationData.verificationNotes || null
      })
      .where(eq(students.id, verificationData.studentId))
      .returning();
    
    return result[0];
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const totalStudents = await this.db.select({ count: count() }).from(students);
    
    const verifiedStudents = await this.db.select({ count: count() })
      .from(students)
      .where(eq(students.status, 'verified'));
    
    const pendingStudents = await this.db.select({ count: count() })
      .from(students)
      .where(eq(students.status, 'pending'));
    
    const rejectedStudents = await this.db.select({ count: count() })
      .from(students)
      .where(eq(students.status, 'rejected'));
    
    return {
      totalStudents: Number(totalStudents[0].count),
      verifiedStudents: Number(verifiedStudents[0].count),
      pendingStudents: Number(pendingStudents[0].count),
      rejectedStudents: Number(rejectedStudents[0].count)
    };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private students: Map<number, Student>;
  private userIdCounter: number;
  private studentIdCounter: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.students = new Map();
    this.userIdCounter = 1;
    this.studentIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Seed admin account
    this.seedAdmin();
  }

  private async seedAdmin() {
    const adminExists = await this.getUserByUsername('admin');
    if (!adminExists) {
      await this.createUser({
        username: 'admin',
        password: await this.hashPassword('admin123'),
        fullName: 'Admin Sekolah',
        role: 'admin',
        studentId: null
      });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...userData, 
      id,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByNisn(nisn: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.nisn === nisn
    );
  }

  async getStudents(query?: { status?: string; className?: string }): Promise<Student[]> {
    let students = Array.from(this.students.values());
    
    if (query) {
      if (query.status) {
        students = students.filter(student => student.status === query.status);
      }
      
      if (query.className) {
        students = students.filter(student => student.className === query.className);
      }
    }
    
    return students;
  }

  async createStudent(studentData: InsertStudent): Promise<Student> {
    const id = this.studentIdCounter++;
    const student: Student = { 
      ...studentData, 
      id,
      verifiedBy: null,
      verificationDate: null,
      verificationNotes: null,
      createdAt: new Date()
    };
    
    this.students.set(id, student);
    return student;
  }

  async updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const student = await this.getStudent(id);
    if (!student) return undefined;
    
    const updatedStudent: Student = { 
      ...student, 
      ...data 
    };
    
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    const exists = this.students.has(id);
    if (exists) {
      this.students.delete(id);
      return true;
    }
    return false;
  }

  async verifyStudent(verificationData: VerificationData, verifiedBy: number): Promise<Student | undefined> {
    const student = await this.getStudent(verificationData.studentId);
    if (!student) return undefined;
    
    const updatedStudent: Student = { 
      ...student, 
      status: verificationData.status,
      verifiedBy: verifiedBy,
      verificationDate: new Date(),
      verificationNotes: verificationData.verificationNotes || null
    };
    
    this.students.set(student.id, updatedStudent);
    return updatedStudent;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const students = Array.from(this.students.values());
    
    return {
      totalStudents: students.length,
      verifiedStudents: students.filter(s => s.status === 'verified').length,
      pendingStudents: students.filter(s => s.status === 'pending').length,
      rejectedStudents: students.filter(s => s.status === 'rejected').length
    };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }
}

// Change to use PostgreSQL database storage
export const storage = new DatabaseStorage();
