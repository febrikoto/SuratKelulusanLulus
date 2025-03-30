import { User, Student, InsertUser, InsertStudent, VerificationData, Settings, InsertSettings, Grade, InsertGrade, Subject, InsertSubject, students, users, settings, grades, subjects } from "@shared/schema";
import { DashboardStats } from "@shared/types";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import createMemoryStore from "memorystore";
import { eq, and, sql, count, isNotNull as notNull, ne as not } from "drizzle-orm";
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
  updateUserWelcomeStatus(id: number, hasSeenWelcome: boolean): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
  // Student operations
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByNisn(nisn: string): Promise<Student | undefined>;
  getStudents(query?: { status?: string; className?: string }): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;

  // Verification operations
  verifyStudent(verificationData: VerificationData, verifiedBy: number): Promise<Student | undefined>;
  
  // Settings operations
  getSettings(): Promise<Settings | undefined>;
  saveSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(data: Partial<InsertSettings>): Promise<Settings | undefined>;
  
  // Grades operations
  getStudentGrades(studentId: number): Promise<Grade[]>;
  saveGrade(grade: InsertGrade): Promise<Grade>;
  saveGrades(grades: InsertGrade[]): Promise<Grade[]>;
  deleteGrade(id: number): Promise<boolean>;
  
  // Subject operations
  getSubjects(query?: { major?: string; group?: string }): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjectByCode(code: string): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number): Promise<boolean>;
  
  // New method for getting summary of grades by student
  getGradesSummary(): Promise<{ studentId: number; count: number }[]>;
  
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

  async updateUserWelcomeStatus(id: number, hasSeenWelcome: boolean): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({ hasSeenWelcome })
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
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

  async getSettings(): Promise<Settings | undefined> {
    const result = await this.db.select().from(settings);
    return result[0];
  }
  
  async saveSettings(settingsData: InsertSettings): Promise<Settings> {
    // Check if settings already exist
    const existing = await this.getSettings();
    
    if (existing) {
      // Update existing settings
      return this.updateSettings(settingsData) as Promise<Settings>;
    } else {
      // Create new settings
      const result = await this.db.insert(settings).values(settingsData).returning();
      return result[0];
    }
  }
  
  async updateSettings(data: Partial<InsertSettings>): Promise<Settings | undefined> {
    const existing = await this.getSettings();
    
    if (!existing) {
      return undefined;
    }
    
    const result = await this.db.update(settings)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(settings.id, existing.id))
      .returning();
    
    return result[0];
  }
  
  async getStudentGrades(studentId: number): Promise<Grade[]> {
    return await this.db.select()
      .from(grades)
      .where(eq(grades.studentId, studentId))
      .orderBy(grades.subjectName);
  }
  
  async saveGrade(grade: InsertGrade): Promise<Grade> {
    const result = await this.db.insert(grades)
      .values(grade)
      .returning();
    
    return result[0];
  }
  
  async saveGrades(gradesData: InsertGrade[]): Promise<Grade[]> {
    if (gradesData.length === 0) return [];
    
    const result = await this.db.insert(grades)
      .values(gradesData)
      .returning();
    
    return result;
  }
  
  async deleteGrade(id: number): Promise<boolean> {
    const result = await this.db.delete(grades)
      .where(eq(grades.id, id))
      .returning({ id: grades.id });
    
    return result.length > 0;
  }
  
  // Subject operations implementation
  async getSubjects(query?: { major?: string; group?: string }): Promise<Subject[]> {
    let query_builder = this.db.select().from(subjects);
    
    if (query) {
      if (query.major && query.group) {
        query_builder = query_builder.where(
          and(
            eq(subjects.major, query.major),
            eq(subjects.group, query.group)
          )
        );
      } else if (query.major) {
        query_builder = query_builder.where(eq(subjects.major, query.major));
      } else if (query.group) {
        query_builder = query_builder.where(eq(subjects.group, query.group));
      }
    }
    
    return await query_builder;
  }
  
  async getSubject(id: number): Promise<Subject | undefined> {
    const result = await this.db.select().from(subjects).where(eq(subjects.id, id));
    return result[0];
  }
  
  async getSubjectByCode(code: string): Promise<Subject | undefined> {
    const result = await this.db.select().from(subjects).where(eq(subjects.code, code));
    return result[0];
  }
  
  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    const result = await this.db.insert(subjects).values(subjectData).returning();
    return result[0];
  }
  
  async updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject | undefined> {
    const result = await this.db.update(subjects)
      .set(data)
      .where(eq(subjects.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteSubject(id: number): Promise<boolean> {
    const result = await this.db.delete(subjects)
      .where(eq(subjects.id, id))
      .returning({ id: subjects.id });
    
    return result.length > 0;
  }

  async getGradesSummary(): Promise<{ studentId: number; count: number }[]> {
    // Group grades by student and count them
    const result = await this.db.select({
      studentId: grades.studentId,
      count: count()
    })
    .from(grades)
    .groupBy(grades.studentId);
    
    return result.map(row => ({
      studentId: row.studentId,
      count: Number(row.count)
    }));
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
    
    // Mendapatkan jumlah kelas unik dengan pendekatan yang lebih sederhana
    const classesQuery = await this.db.selectDistinct({ className: students.className })
      .from(students)
      .where(sql`${students.className} IS NOT NULL AND ${students.className} != ''`);
    
    const totalClasses = classesQuery.length;
    
    return {
      totalStudents: Number(totalStudents[0].count),
      verifiedStudents: Number(verifiedStudents[0].count),
      pendingStudents: Number(pendingStudents[0].count),
      rejectedStudents: Number(rejectedStudents[0].count),
      totalClasses
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
  private settings: Settings | undefined;
  private grades: Map<number, Grade>;
  private subjects: Map<number, Subject>;
  private userIdCounter: number;
  private studentIdCounter: number;
  private gradeIdCounter: number;
  private subjectIdCounter: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.students = new Map();
    this.grades = new Map();
    this.subjects = new Map();
    this.settings = undefined;
    this.userIdCounter = 1;
    this.studentIdCounter = 1;
    this.gradeIdCounter = 1;
    this.subjectIdCounter = 1;
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
      hasSeenWelcome: false,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserWelcomeStatus(id: number, hasSeenWelcome: boolean): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      hasSeenWelcome
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      ...data
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
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

  async getSettings(): Promise<Settings | undefined> {
    return this.settings;
  }
  
  async saveSettings(settingsData: InsertSettings): Promise<Settings> {
    if (this.settings) {
      return this.updateSettings(settingsData) as Promise<Settings>;
    } else {
      const settings: Settings = {
        id: 1,
        ...settingsData,
        updatedAt: new Date()
      };
      this.settings = settings;
      return settings;
    }
  }
  
  async updateSettings(data: Partial<InsertSettings>): Promise<Settings | undefined> {
    if (!this.settings) return undefined;
    
    this.settings = {
      ...this.settings,
      ...data,
      updatedAt: new Date()
    };
    
    return this.settings;
  }

  async getStudentGrades(studentId: number): Promise<Grade[]> {
    return Array.from(this.grades.values())
      .filter(grade => grade.studentId === studentId)
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }
  
  async saveGrade(grade: InsertGrade): Promise<Grade> {
    const id = this.gradeIdCounter++;
    const newGrade: Grade = {
      ...grade,
      id,
      createdAt: new Date()
    };
    
    this.grades.set(id, newGrade);
    return newGrade;
  }
  
  async saveGrades(gradesData: InsertGrade[]): Promise<Grade[]> {
    return Promise.all(gradesData.map(grade => this.saveGrade(grade)));
  }
  
  async deleteGrade(id: number): Promise<boolean> {
    const exists = this.grades.has(id);
    if (exists) {
      this.grades.delete(id);
      return true;
    }
    return false;
  }

  async getGradesSummary(): Promise<{ studentId: number; count: number }[]> {
    // Group grades by student and count them
    const allGrades = Array.from(this.grades.values());
    const gradesByStudent = new Map<number, number>();
    
    // Count grades for each student
    allGrades.forEach(grade => {
      const currentCount = gradesByStudent.get(grade.studentId) || 0;
      gradesByStudent.set(grade.studentId, currentCount + 1);
    });
    
    // Convert map to array of objects
    return Array.from(gradesByStudent.entries()).map(([studentId, count]) => ({
      studentId,
      count
    }));
  }
  
  async getDashboardStats(): Promise<DashboardStats> {
    const students = Array.from(this.students.values());
    
    // Mendapatkan daftar kelas unik
    const uniqueClasses = new Set<string>();
    students.forEach(student => {
      if (student.className && student.className.trim() !== '') {
        uniqueClasses.add(student.className);
      }
    });
    
    return {
      totalStudents: students.length,
      verifiedStudents: students.filter(s => s.status === 'verified').length,
      pendingStudents: students.filter(s => s.status === 'pending').length,
      rejectedStudents: students.filter(s => s.status === 'rejected').length,
      totalClasses: uniqueClasses.size
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
  
  // Subject operations implementation
  async getSubjects(query?: { major?: string; group?: string }): Promise<Subject[]> {
    let subjects = Array.from(this.subjects.values());
    
    if (query) {
      if (query.major) {
        subjects = subjects.filter(subject => subject.major === query.major);
      }
      
      if (query.group) {
        subjects = subjects.filter(subject => subject.group === query.group);
      }
    }
    
    return subjects;
  }
  
  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }
  
  async getSubjectByCode(code: string): Promise<Subject | undefined> {
    return Array.from(this.subjects.values()).find(
      (subject) => subject.code === code
    );
  }
  
  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    const id = this.subjectIdCounter++;
    const subject: Subject = { 
      ...subjectData, 
      id,
      createdAt: new Date()
    };
    
    this.subjects.set(id, subject);
    return subject;
  }
  
  async updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject | undefined> {
    const subject = await this.getSubject(id);
    if (!subject) return undefined;
    
    const updatedSubject: Subject = { 
      ...subject, 
      ...data 
    };
    
    this.subjects.set(id, updatedSubject);
    return updatedSubject;
  }
  
  async deleteSubject(id: number): Promise<boolean> {
    const exists = this.subjects.has(id);
    if (exists) {
      this.subjects.delete(id);
      return true;
    }
    return false;
  }
}

// Change to use PostgreSQL database storage
export const storage = new DatabaseStorage();