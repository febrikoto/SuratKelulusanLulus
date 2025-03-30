import path from "path";
import fs from "fs";
import { Express, Request, Response, NextFunction } from "express";
import { Server } from "http";
import { Readable } from "stream";
import csvParser from "csv-parser";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";

import { storage } from "./storage";
import {
  insertStudentSchema,
  insertSettingsSchema,
  insertGradeSchema,
  insertSubjectSchema,
  verificationSchema,
  users,
  grades,
  students,
  subjects
} from "@shared/schema";
import { setupAuth, requireAuth, requireRole } from "./auth";
import multer from "multer";
import { generateCertificatePDF } from "./certificate-generator";
import { CertificateData } from "@shared/types";
import * as XLSX from 'xlsx';

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Cache settings to reduce database hits
let cachedSettings: any = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Utility function to convert Excel date to YYYY-MM-DD
function excelDateToYMD(excelDate: number) {
  // Excel dates are number of days since Dec 30, 1899
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  if (!fs.existsSync('uploads/logos')) {
    fs.mkdirSync('uploads/logos', { recursive: true });
  }

  if (!fs.existsSync('uploads/signatures')) {
    fs.mkdirSync('uploads/signatures', { recursive: true });
  }

  if (!fs.existsSync('uploads/stamps')) {
    fs.mkdirSync('uploads/stamps', { recursive: true });
  }

  if (!fs.existsSync('uploads/headers')) {
    fs.mkdirSync('uploads/headers', { recursive: true });
  }
  
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Cache untuk statistik dashboard
  let cachedDashboardStats: any = null;
  let dashboardStatsCacheTime = 0;
  const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 menit dalam milidetik
  
  // Fungsi untuk mendapatkan statistik dashboard dengan caching
  async function getDashboardStatsWithCache() {
    // Periksa apakah cache masih valid
    if (cachedDashboardStats && (Date.now() - dashboardStatsCacheTime < DASHBOARD_CACHE_TTL)) {
      return cachedDashboardStats;
    }
    
    // Jika tidak, ambil data baru dari penyimpanan
    const stats = await storage.getDashboardStats();
    
    // Perbarui cache
    cachedDashboardStats = stats;
    dashboardStatsCacheTime = Date.now();
    
    return stats;
  }
  
  // Dashboard statistics
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const stats = await getDashboardStatsWithCache();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });
  
  // Alias for dashboard statistics to maintain compatibility with frontend
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await getDashboardStatsWithCache();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });
  
  // Fungsi untuk membatalkan cache dashboard 
  // (akan dipanggil saat data siswa berubah)
  function invalidateDashboardCache() {
    cachedDashboardStats = null;
    dashboardStatsCacheTime = 0;
  }

  // Settings API endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      // Check if cache is valid
      if (cachedSettings && (Date.now() - settingsCacheTime < SETTINGS_CACHE_TTL)) {
        return res.json(cachedSettings);
      }

      const settings = await storage.getSettings();
      if (!settings) {
        // If no settings exist, create default settings
        const defaultSettings = {
          schoolName: "YOUR SCHOOL NAME",
          schoolAddress: "School Address",
          schoolEmail: "school@example.com",
          schoolWebsite: "www.school.example",
          cityName: "City",
          provinceName: "Province",
          academicYear: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
          graduationDate: new Date().toISOString().split('T')[0],
          headmasterName: "Headmaster Name",
          headmasterNip: "123456789",
          certNumberPrefix: "SKL",
          certBeforeStudentData: "Menerangkan bahwa:",
          certAfterStudentData: "Telah mengikuti Ujian Sekolah dalam program pendidikan:",
          certRegulationText: "Berdasarkan hasil Ujian Sekolah (US) serta nilai rapor yang bersangkutan dinyatakan:",
          certCriteriaText: "LULUS",
          useDigitalSignature: false,
          useHeaderImage: false,
          classList: "X,XI,XII"
        };

        const newSettings = await storage.saveSettings(defaultSettings);
        
        // Update cache
        cachedSettings = newSettings;
        settingsCacheTime = Date.now();
        
        return res.json(newSettings);
      }

      // Update cache
      cachedSettings = settings;
      settingsCacheTime = Date.now();

      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", requireRole(["admin"]), async (req, res) => {
    try {
      const validation = insertSettingsSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid settings data",
          errors: validation.error.errors
        });
      }

      const updatedSettings = await storage.updateSettings(req.body);
      
      // Invalidate settings cache
      cachedSettings = updatedSettings;
      settingsCacheTime = Date.now();
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });
  
  // Endpoint untuk menghapus gambar (logo, stempel, ttd, kop)
  app.delete("/api/settings/image/:type", requireRole(["admin"]), async (req, res) => {
    try {
      const { type } = req.params;
      
      // Validasi tipe gambar yang bisa dihapus
      const validImageTypes = ['schoolLogo', 'ministryLogo', 'headmasterSignature', 'schoolStamp', 'headerImage'];
      if (!validImageTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid image type" });
      }
      
      // Dapatkan settings saat ini
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      
      // Buat objek update dengan nilai gambar yang dihapus (string kosong)
      const updateData = { [type]: '' } as any;
      
      // Jika yang dihapus adalah headerImage, nonaktifkan penggunaannya
      if (type === 'headerImage') {
        updateData.useHeaderImage = false;
      }
      
      const updatedSettings = await storage.updateSettings(updateData);
      
      // Invalidate settings cache
      cachedSettings = updatedSettings;
      settingsCacheTime = Date.now();
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Delete image error:", error);
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // School Logo Upload
  app.post("/api/upload/school-logo", requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate a unique filename
      const filename = `school_logo_${Date.now()}${path.extname(req.file.originalname)}`;
      const filepath = path.join('uploads/logos', filename);

      // Save the file
      fs.writeFileSync(filepath, req.file.buffer);

      // Update the school logo in settings
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      const updatedSettings = await storage.updateSettings({
        schoolLogo: filepath
      });

      // Invalidate settings cache
      cachedSettings = updatedSettings;
      settingsCacheTime = Date.now();

      res.json({
        message: "Logo uploaded successfully",
        path: filepath,
        settings: updatedSettings
      });
    } catch (error) {
      console.error("Error uploading school logo:", error);
      res.status(500).json({ message: "Failed to upload school logo" });
    }
  });

  // Letterhead Image Upload
  app.post("/api/upload/header-image", requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate a unique filename
      const filename = `header_image_${Date.now()}${path.extname(req.file.originalname)}`;
      const filepath = path.join('uploads/headers', filename);

      // Save the file
      fs.writeFileSync(filepath, req.file.buffer);

      // Update the header image in settings
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      const updatedSettings = await storage.updateSettings({
        headerImage: filepath,
        useHeaderImage: true // Automatically set to use this image
      });

      // Invalidate settings cache
      cachedSettings = updatedSettings;
      settingsCacheTime = Date.now();

      res.json({
        message: "Header image uploaded successfully",
        path: filepath,
        settings: updatedSettings
      });
    } catch (error) {
      console.error("Error uploading header image:", error);
      res.status(500).json({ message: "Failed to upload header image" });
    }
  });

  // Ministry Logo Upload
  app.post("/api/upload/ministry-logo", requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate a unique filename
      const filename = `ministry_logo_${Date.now()}${path.extname(req.file.originalname)}`;
      const filepath = path.join('uploads/logos', filename);

      // Save the file
      fs.writeFileSync(filepath, req.file.buffer);

      // Update the ministry logo in settings
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      const updatedSettings = await storage.updateSettings({
        ministryLogo: filepath
      });

      // Invalidate settings cache
      cachedSettings = updatedSettings;
      settingsCacheTime = Date.now();

      res.json({
        message: "Logo uploaded successfully",
        path: filepath,
        settings: updatedSettings
      });
    } catch (error) {
      console.error("Error uploading ministry logo:", error);
      res.status(500).json({ message: "Failed to upload ministry logo" });
    }
  });

  // Headmaster Signature Upload
  app.post("/api/upload/headmaster-signature", requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate a unique filename
      const filename = `signature_${Date.now()}${path.extname(req.file.originalname)}`;
      const filepath = path.join('uploads/signatures', filename);

      // Save the file
      fs.writeFileSync(filepath, req.file.buffer);

      // Update the signature in settings
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      const updatedSettings = await storage.updateSettings({
        headmasterSignature: filepath
      });

      // Invalidate settings cache
      cachedSettings = updatedSettings;
      settingsCacheTime = Date.now();

      res.json({
        message: "Signature uploaded successfully",
        path: filepath,
        settings: updatedSettings
      });
    } catch (error) {
      console.error("Error uploading signature:", error);
      res.status(500).json({ message: "Failed to upload signature" });
    }
  });

  // School Stamp Upload
  app.post("/api/upload/school-stamp", requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate a unique filename
      const filename = `stamp_${Date.now()}${path.extname(req.file.originalname)}`;
      const filepath = path.join('uploads/stamps', filename);

      // Save the file
      fs.writeFileSync(filepath, req.file.buffer);

      // Update the stamp in settings
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      const updatedSettings = await storage.updateSettings({
        schoolStamp: filepath
      });

      // Invalidate settings cache
      cachedSettings = updatedSettings;
      settingsCacheTime = Date.now();

      res.json({
        message: "Stamp uploaded successfully",
        path: filepath,
        settings: updatedSettings
      });
    } catch (error) {
      console.error("Error uploading stamp:", error);
      res.status(500).json({ message: "Failed to upload stamp" });
    }
  });

  // Create database backup
  app.get("/api/backup", requireRole(["admin"]), async (req, res) => {
    try {
      // Get all data from different tables
      const studentsData = await storage.getStudents();
      const usersData = await storage.db.select().from(users);
      const settingsData = await storage.getSettings();
      const gradesData = await storage.db.select().from(grades);
      const subjectsData = await storage.db.select().from(subjects);

      // Create a backup object
      const backup = {
        timestamp: new Date().toISOString(),
        students: studentsData,
        users: usersData,
        settings: settingsData,
        grades: gradesData,
        subjects: subjectsData
      };

      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create a backup file
      const backupFile = path.join(tempDir, `skl_backup_${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

      // Send the file to the client
      res.download(backupFile, 'backup.json', (err) => {
        if (err) {
          console.error("Error downloading backup:", err);
          return res.status(500).send("Gagal mengunduh backup");
        }
      });
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ message: "Gagal membuat backup" });
    }
  });

  // Student API endpoints
  app.get("/api/students", requireAuth, async (req, res) => {
    try {
      const { status, className } = req.query;
      const query: { status?: string; className?: string } = {};

      if (status) query.status = status as string;
      if (className) query.className = className as string;

      const students = await storage.getStudents(query);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Get student profile (for logged-in student)
  app.get("/api/students/profile", requireRole(["siswa"]), async (req, res) => {
    try {
      const user = req.user as Express.User;

      if (!user.studentId) {
        return res.status(404).json({ message: "No student profile linked to this account" });
      }

      const student = await storage.getStudent(user.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student profile" });
    }
  });

  app.get("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.post("/api/students", requireRole(["admin"]), async (req, res) => {
    try {
      const validation = insertStudentSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid student data", 
          errors: validation.error.errors 
        });
      }

      // Check if student with NISN already exists
      const existingStudent = await storage.getStudentByNisn(req.body.nisn);
      if (existingStudent) {
        return res.status(409).json({ message: "Student with this NISN already exists" });
      }

      const newStudent = await storage.createStudent(req.body);
      
      // Invalidate dashboard cache karena data siswa berubah
      invalidateDashboardCache();
      
      res.status(201).json(newStudent);
    } catch (error) {
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.put("/api/students/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const validation = insertStudentSchema.partial().safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid student data", 
          errors: validation.error.errors 
        });
      }

      // If NISN is being updated, check if it already exists
      if (req.body.nisn) {
        const existingStudent = await storage.getStudentByNisn(req.body.nisn);
        if (existingStudent && existingStudent.id !== id) {
          return res.status(409).json({ message: "Student with this NISN already exists" });
        }
      }

      const updatedStudent = await storage.updateStudent(id, req.body);
      if (!updatedStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Invalidate dashboard cache karena data siswa berubah
      invalidateDashboardCache();

      res.json(updatedStudent);
    } catch (error) {
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const success = await storage.deleteStudent(id);
      if (!success) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Invalidate dashboard cache karena data siswa berubah
      invalidateDashboardCache();

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Verify student endpoint
  app.post("/api/students/:id/verify", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const validation = verificationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid verification data", 
          errors: validation.error.errors 
        });
      }

      const user = req.user as Express.User;
      const updatedStudent = await storage.verifyStudent(req.body, user.id);
      
      if (!updatedStudent) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Invalidate dashboard cache karena status verifikasi siswa berubah
      invalidateDashboardCache();

      res.json(updatedStudent);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify student" });
    }
  });

  // Note: Certificate PDF generation endpoint is implemented below (around line 1230)

  // Grades API endpoints
  app.post("/api/grades", requireRole(["admin"]), async (req, res) => {
    try {
      const { studentId, subjectName, value } = req.body;

      if (!studentId || !subjectName || value === undefined) {
        return res.status(400).json({ message: "Data nilai tidak lengkap" });
      }

      // Check if student exists
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Siswa tidak ditemukan" });
      }

      const gradeData = {
        studentId,
        subjectName,
        value
      };

      const validation = insertGradeSchema.safeParse(gradeData);
      if (!validation.success) {
        return res.status(400).json({
          message: "Data nilai tidak valid",
          errors: validation.error.errors
        });
      }

      const savedGrade = await storage.saveGrade(gradeData);
      return res.status(201).json(savedGrade);
    } catch (error) {
      console.error("Error saving grade:", error);
      res.status(500).json({ message: "Gagal menyimpan nilai" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.post("/api/students/:id/grades", requireRole(["admin"]), async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      if (isNaN(studentId)) {
        return res.status(400).json({ message: "ID siswa tidak valid" });
      }

      // Check if student exists
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Siswa tidak ditemukan" });
      }

      // Handle both single grade and multiple grades
      if (Array.isArray(req.body)) {
        // Multiple grades
        const gradesData = req.body.map(grade => ({
          ...grade,
          studentId
        }));

        const validations = gradesData.map(grade => insertGradeSchema.safeParse(grade));
        const invalidGrades = validations.filter(v => !v.success);

        if (invalidGrades.length > 0) {
          return res.status(400).json({
            message: "Data nilai tidak valid",
            errors: invalidGrades.map(v => (v as any).error.errors)
          });
        }

        const savedGrades = await storage.saveGrades(gradesData);
        return res.status(201).json(savedGrades);
      } else {
        // Single grade
        const gradeData = {
          ...req.body,
          studentId
        };

        const validation = insertGradeSchema.safeParse(gradeData);
        if (!validation.success) {
          return res.status(400).json({
            message: "Data nilai tidak valid",
            errors: validation.error.errors
          });
        }

        const savedGrade = await storage.saveGrade(gradeData);
        return res.status(201).json(savedGrade);
      }
    } catch (error) {
      res.status(500).json({ message: "Gagal menyimpan nilai" });
    }
  });

  app.delete("/api/grades/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID nilai tidak valid" });
      }

      const success = await storage.deleteGrade(id);
      if (!success) {
        return res.status(404).json({ message: "Nilai tidak ditemukan" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Gagal menghapus nilai" });
    }
  });

  // Generate Excel template for grade import
  // Add endpoint to get summary of student grades (count of grades per student)
  app.get("/api/grades-summary", requireRole(["admin", "guru"]), async (req, res) => {
    try {
      // Get all grades from database grouped by student
      // This endpoint returns an array of objects with studentId and count properties
      const result = await storage.getGradesSummary();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: `Error fetching grade summary: ${error.message}` });
    }
  });
  
  app.get("/api/grades/template", requireAuth, async (req, res) => {
    try {
      // We'll send a simple JSON response with sample data structure
      // The actual Excel template will be generated on the client side
      res.status(200).json({
        message: "Template structure for grades import",
        sample: [
          { nisn: "1234567890", subjectName: "Matematika", value: 85 },
          { nisn: "1234567890", subjectName: "Bahasa Indonesia", value: 90 },
          { nisn: "0987654321", subjectName: "Matematika", value: 78 },
          { nisn: "0987654321", subjectName: "Bahasa Indonesia", value: 82 }
        ]
      });
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "Gagal membuat template" });
    }
  });

  // Subjects API endpoints
  app.get("/api/subjects", requireRole(["admin", "guru"]), async (req, res) => {
    try {
      const { major, group } = req.query;
      const query: { major?: string; group?: string } = {};

      if (major) query.major = major as string;
      if (group) query.group = group as string;

      const subjects = await storage.getSubjects(query);
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Gagal mengambil data mata pelajaran" });
    }
  });

  app.get("/api/subjects/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID mata pelajaran tidak valid" });
      }

      const subject = await storage.getSubject(id);
      if (!subject) {
        return res.status(404).json({ message: "Mata pelajaran tidak ditemukan" });
      }

      res.json(subject);
    } catch (error) {
      console.error("Error fetching subject:", error);
      res.status(500).json({ message: "Gagal mengambil data mata pelajaran" });
    }
  });

  app.post("/api/subjects", requireRole(["admin"]), async (req, res) => {
    try {
      const validation = insertSubjectSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: "Data mata pelajaran tidak valid", 
          errors: validation.error.errors 
        });
      }

      // Check if subject with the same code already exists
      const existingSubject = await storage.getSubjectByCode(req.body.code);
      if (existingSubject) {
        return res.status(409).json({ message: "Mata pelajaran dengan kode ini sudah ada" });
      }

      const newSubject = await storage.createSubject(req.body);
      res.status(201).json(newSubject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ message: "Gagal membuat mata pelajaran" });
    }
  });

  app.put("/api/subjects/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID mata pelajaran tidak valid" });
      }

      const validation = insertSubjectSchema.partial().safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: "Data mata pelajaran tidak valid", 
          errors: validation.error.errors 
        });
      }

      // If we're updating the code, check if it already exists
      if (req.body.code) {
        const existingSubject = await storage.getSubjectByCode(req.body.code);
        if (existingSubject && existingSubject.id !== id) {
          return res.status(409).json({ message: "Mata pelajaran dengan kode ini sudah ada" });
        }
      }

      const updatedSubject = await storage.updateSubject(id, req.body);
      if (!updatedSubject) {
        return res.status(404).json({ message: "Mata pelajaran tidak ditemukan" });
      }

      res.json(updatedSubject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(500).json({ message: "Gagal memperbarui mata pelajaran" });
    }
  });

  app.delete("/api/subjects/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID mata pelajaran tidak valid" });
      }

      const success = await storage.deleteSubject(id);
      if (!success) {
        return res.status(404).json({ message: "Mata pelajaran tidak ditemukan" });
      }

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ message: "Gagal menghapus mata pelajaran" });
    }
  });
  
  // Get all teachers
  app.get("/api/teachers", requireRole(["admin"]), async (req, res) => {
    try {
      // Query users with role 'guru'
      const result = await storage.db.select()
        .from(users)
        .where(eq(users.role, 'guru'));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      res.status(500).json({ message: "Gagal mengambil data guru" });
    }
  });

  // Bulk import subjects from Excel/CSV
  app.post("/api/subjects/import", requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Tidak ada file yang diunggah" });
      }

      if (req.file.mimetype !== 'text/csv') {
        return res.status(400).json({ message: "Hanya file CSV yang diperbolehkan" });
      }

      const results: any[] = [];
      const errors: any[] = [];

      // Parse CSV file
      const stream = Readable.from(req.file.buffer.toString());

      stream
        .pipe(csvParser())
        .on('data', async (data) => {
          try {
            // Map CSV columns to subject schema
            const subjectData = {
              code: data.code,
              name: data.name,
              group: data.group,
              credits: parseInt(data.credits),
              major: data.major || 'semua',
              status: data.status || 'aktif'
            };

            const validation = insertSubjectSchema.safeParse(subjectData);

            if (!validation.success) {
              errors.push({ data, errors: validation.error.errors });
              return;
            }

            // Check if subject already exists
            const existingSubject = await storage.getSubjectByCode(subjectData.code);
            if (existingSubject) {
              errors.push({ data, error: "Mata pelajaran dengan kode ini sudah ada" });
              return;
            }

            const newSubject = await storage.createSubject(subjectData);
            results.push(newSubject);
          } catch (error) {
            errors.push({ data, error: "Gagal memproses baris" });
          }
        })
        .on('end', () => {
          res.json({
            success: true,
            imported: results.length,
            errors: errors.length > 0 ? errors : null
          });
        });
    } catch (error) {
      console.error("Failed to import subjects:", error);
      res.status(500).json({ message: "Gagal mengimpor mata pelajaran" });
    }
  });

  // Bulk import grades from Excel
  app.post("/api/grades/import", requireRole(["admin"]), async (req, res) => {
    try {
      const gradesData = req.body;

      if (!Array.isArray(gradesData) || gradesData.length === 0) {
        return res.status(400).json({ message: "Format data nilai tidak valid" });
      }

      let successCount = 0;
      let errorCount = 0;
      let errors = [];

      // Process each grade entry
      for (const gradeEntry of gradesData) {
        const { nisn, subjectName, value } = gradeEntry;

        if (!nisn || !subjectName || value === undefined) {
          errorCount++;
          errors.push({
            nisn: nisn || 'N/A',
            error: 'Data tidak lengkap'
          });
          continue;
        }

        try {
          // Find student by NISN
          const student = await storage.getStudentByNisn(nisn);
          if (!student) {
            errorCount++;
            errors.push({
              nisn,
              error: 'Siswa dengan NISN ini tidak ditemukan'
            });
            continue;
          }

          // Save grade for this student
          await storage.saveGrade({
            studentId: student.id,
            subjectName,
            value
          });

          successCount++;
        } catch (error) {
          console.error(`Error processing grade for NISN ${nisn}:`, error);
          errorCount++;
          errors.push({
            nisn,
            error: 'Terjadi kesalahan saat menyimpan nilai'
          });
        }
      }

      res.status(200).json({
        success: successCount,
        errors: errorCount,
        errorDetails: errors,
        message: `Berhasil mengimpor ${successCount} nilai, dengan ${errorCount} error.`
      });
    } catch (error) {
      console.error("Failed to import grades:", error);
      res.status(500).json({ message: "Gagal mengimpor nilai" });
    }
  });

  // Import grades by class (one row per student with multiple subject columns)
  app.post("/api/grades/import-class", requireRole(["admin"]), async (req, res) => {
    try {
      // Check if we have the required data
      const { students, subjects, className } = req.body;

      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ message: "Format data siswa tidak valid" });
      }

      if (!Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ message: "Format data mata pelajaran tidak valid" });
      }

      if (!className) {
        return res.status(400).json({ message: "Kelas harus ditentukan" });
      }

      // Prepare grades data for storage
      const gradesData: any[] = [];
      let errorCount = 0;
      let successCount = 0;

      // Process each student
      for (const student of students) {
        // Make sure the student has an ID
        if (!student.studentId) {
          errorCount++;
          continue;
        }

        // Process each subject
        for (const subject of subjects) {
          // Check if the student has a value for this subject
          if (student[subject.code] !== undefined) {
            try {
              // Find or create the subject if needed
              let subjectId = subject.id;

              if (!subjectId) {
                // Try to find the subject by code
                const existingSubject = await storage.getSubjectByCode(subject.code);

                if (existingSubject) {
                  subjectId = existingSubject.id;
                } else {
                  // Create a new subject
                  const newSubject = await storage.createSubject({
                    code: subject.code,
                    name: subject.name,
                    group: 'Wajib', // Default group
                    major: 'semua', // No specific major
                    credits: 1, // Default credits value
                    status: 'aktif' // Default status
                  });

                  subjectId = newSubject.id;
                }
              }

              // Create the grade entry
              gradesData.push({
                studentId: student.studentId,
                subjectId,
                value: student[subject.code]
              });

              successCount++;
            } catch (error) {
              console.error("Error processing grade:", error);
              errorCount++;
              continue;
            }
          }
        }
      }

      // Save all grades
      if (gradesData.length > 0) {
        const savedGrades = await storage.saveGrades(gradesData);
        
        res.status(200).json({
          success: successCount,
          errors: errorCount,
          message: `Berhasil mengimpor ${successCount} nilai, dengan ${errorCount} error.`
        });
      } else {
        res.status(400).json({ message: "Tidak ada nilai yang valid untuk disimpan" });
      }
    } catch (error) {
      console.error("Failed to import grades by class:", error);
      res.status(500).json({ message: "Gagal mengimpor nilai" });
    }
  });

  // Fetch student grades
  app.get("/api/students/:id/grades", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID siswa tidak valid" });
      }

      // Check if student exists
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "Siswa tidak ditemukan" });
      }

      // Check user permissions - siswa can only access their own grades
      const user = req.user as Express.User;
      if (user.role === 'siswa' && user.studentId !== id) {
        return res.status(403).json({ message: "Anda tidak berhak mengakses nilai siswa lain" });
      }

      const grades = await storage.getStudentGrades(id);
      res.json(grades);
    } catch (error) {
      console.error("Error fetching grades:", error);
      res.status(500).json({ message: "Gagal mengambil data nilai" });
    }
  });

  // Import students from Excel/CSV
  app.post("/api/students/import", requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Tidak ada file yang diunggah" });
      }

      // Determine file type from mimetype
      const isCSV = req.file.mimetype === 'text/csv';
      const isExcel = req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                     req.file.mimetype === 'application/vnd.ms-excel';

      if (!isCSV && !isExcel) {
        return res.status(400).json({ message: "Format file tidak didukung. Harap unggah file Excel atau CSV." });
      }

      const results: any[] = [];
      const errors: any[] = [];

      // Process the file accordingly
      if (isCSV) {
        // Parse CSV
        const stream = Readable.from(req.file.buffer.toString());
        stream
          .pipe(csvParser())
          .on('data', async (data) => {
            try {
              await processStudentData(data, results, errors);
            } catch (error) {
              errors.push({ data, error: "Gagal memproses data siswa" });
            }
          })
          .on('end', () => {
            // Invalidate dashboard cache karena data siswa berubah
            invalidateDashboardCache();
            
            res.json({
              success: true,
              imported: results.length,
              errors: errors.length > 0 ? errors : null
            });
          });
      } else {
        // Parse Excel
        const workbook = XLSX.read(req.file.buffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Process each row
        for (const row of data as any[]) {
          try {
            await processStudentData(row, results, errors);
          } catch (error) {
            errors.push({ data: row, error: "Gagal memproses data siswa" });
          }
        }

        // Invalidate dashboard cache karena data siswa berubah
        invalidateDashboardCache();
        
        res.json({
          success: true,
          imported: results.length,
          errors: errors.length > 0 ? errors : null
        });
      }
    } catch (error) {
      console.error("Failed to import students:", error);
      res.status(500).json({ message: "Gagal mengimpor data siswa" });
    }
  });

  async function processStudentData(studentData: any, results: any[], errors: any[]) {
    // Map data fields to our schema
    // Handle different column name variations
    const nisn = studentData.NISN || studentData.nisn;
    const nis = studentData.NIS || studentData.nis;
    const fullName = studentData['Nama Lengkap'] || studentData['NAMA LENGKAP'] || studentData.name || studentData.fullName;
    const birthPlace = studentData['Tempat Lahir'] || studentData.birthPlace;
    
    // Handle date format variations (could be string or Excel date number)
    let birthDate = studentData['Tanggal Lahir'] || studentData.birthDate;
    if (typeof birthDate === 'number') {
      birthDate = excelDateToYMD(birthDate);
    }
    
    const parentName = studentData['Nama Orang Tua'] || studentData.parentName;
    const className = studentData['Kelas'] || studentData.className;
    const major = studentData['Jurusan'] || studentData.major;

    // Prepare student data object
    const sanitizedData = {
      nisn,
      nis,
      fullName,
      birthPlace,
      birthDate,
      parentName,
      className,
      major
    };

    const validation = insertStudentSchema.safeParse(sanitizedData);

    if (!validation.success) {
      errors.push({ 
        data: studentData, 
        errors: validation.error.errors,
        message: "Data tidak valid"
      });
      return;
    }

    // Check if student with NISN already exists
    const existingStudent = await storage.getStudentByNisn(nisn);
    if (existingStudent) {
      errors.push({ 
        data: studentData, 
        error: "Siswa dengan NISN ini sudah ada",
        message: `NISN ${nisn} sudah terdaftar`
      });
      return;
    }

    // Create new student in database
    const newStudent = await storage.createStudent(sanitizedData);
    
    // Also create user account for the student (using NISN as username)
    const hashedPassword = await storage.hashPassword(nisn); // Use NISN as initial password too
    const userAccount = await storage.createUser({
      username: nisn,
      password: hashedPassword,
      fullName: fullName,
      role: 'siswa',
      studentId: newStudent.id,
      hasSeenWelcome: false
    });

    results.push({
      student: newStudent,
      user: {
        id: userAccount.id,
        username: userAccount.username,
        role: userAccount.role
      }
    });
  }

  // User API endpoints
  app.get("/api/users", requireRole(["admin"]), async (req, res) => {
    try {
      const result = await storage.db.select()
        .from(users);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Gagal mengambil data pengguna" });
    }
  });

  app.put("/api/user-welcome", requireAuth, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const updatedUser = await storage.updateUserWelcomeStatus(user.id, true);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating welcome status:", error);
      res.status(500).json({ message: "Failed to update welcome status" });
    }
  });

  app.put("/api/users/:id", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID pengguna tidak valid" });
      }

      const updateData = { ...req.body };
      delete updateData.id; // Prevent ID update
      delete updateData.password; // Password should be updated via separate endpoint

      // If changing role to 'guru', we need to check the assignedMajor field
      if (updateData.role === 'guru' && !updateData.assignedMajor) {
        return res.status(400).json({ 
          message: "Guru harus memiliki jurusan yang diampu", 
          field: "assignedMajor" 
        });
      }

      // Validation logic for user updates can be added here
      const updatedUser = await storage.updateUser(id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Gagal memperbarui pengguna" });
    }
  });

  // Teachers creation endpoint 
  app.post("/api/teachers", requireRole(["admin"]), async (req, res) => {
    try {
      const { username, fullName, assignedMajor } = req.body;

      if (!username || !fullName || !assignedMajor) {
        return res.status(400).json({ message: "Data guru tidak lengkap" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username sudah digunakan" });
      }

      // Create default password using "guru123"
      const hashedPassword = await storage.hashPassword("guru123");
      
      // Create the teacher account
      const newTeacher = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        role: 'guru',
        studentId: null,
        assignedMajor,
        hasSeenWelcome: false
      });

      res.status(201).json(newTeacher);
    } catch (error) {
      console.error("Error creating teacher:", error);
      res.status(500).json({ message: "Gagal membuat akun guru" });
    }
  });

  // Change password endpoint
  app.post("/api/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user as Express.User;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Data tidak lengkap" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password baru terlalu pendek" });
      }

      // Get user's current password hash
      const currentUser = await storage.getUser(user.id);
      if (!currentUser) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan" });
      }

      // Verify current password
      const isCurrentPasswordValid = await storage.comparePasswords(currentPassword, currentUser.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: "Password saat ini tidak valid" });
      }

      // Hash new password
      const hashedPassword = await storage.hashPassword(newPassword);

      // Update password
      const updatedUser = await storage.updateUser(user.id, { password: hashedPassword });
      if (!updatedUser) {
        return res.status(500).json({ message: "Gagal memperbarui password" });
      }

      res.json({ message: "Password berhasil diubah" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Gagal mengubah password" });
    }
  });

  // Reset password endpoint (admin only)
  app.post("/api/users/:id/reset-password", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID pengguna tidak valid" });
      }

      // Get user
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan" });
      }

      // Generate new password based on role
      let newPassword = "";
      if (user.role === 'siswa') {
        // For students, use their NISN
        const student = await storage.getStudent(user.studentId || 0);
        if (student) {
          newPassword = student.nisn; // Use NISN as password
        } else {
          newPassword = "siswa123"; // Fallback if NISN not found
        }
      } else if (user.role === 'guru') {
        newPassword = "guru123";
      } else {
        newPassword = "admin123";
      }

      // Hash new password
      const hashedPassword = await storage.hashPassword(newPassword);

      // Update password
      const updatedUser = await storage.updateUser(id, { password: hashedPassword });
      if (!updatedUser) {
        return res.status(500).json({ message: "Gagal mereset password" });
      }

      res.json({ 
        message: "Password berhasil direset", 
        newPassword: newPassword // Send plaintext password back for admin to communicate to user
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Gagal mereset password" });
    }
  });

  // Generate Excel template for student import
  app.get("/api/students/import/template", requireRole(["admin"]), async (req, res) => {
    return generateExcelTemplate(req, res);
  });

  const generateExcelTemplate = async (req: Request, res: Response) => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Sample data
      const sampleData = [
        { 
          NISN: "1234567890", 
          NIS: "12345", 
          "Nama Lengkap": "Nama Siswa", 
          "Tempat Lahir": "Jakarta", 
          "Tanggal Lahir": "2005-01-01", 
          "Nama Orang Tua": "Nama Ayah", 
          "Kelas": "XII", 
          "Jurusan": "IPA" 
        },
        { 
          NISN: "0987654321", 
          NIS: "54321", 
          "Nama Lengkap": "Nama Siswa 2", 
          "Tempat Lahir": "Bandung", 
          "Tanggal Lahir": "2005-02-15", 
          "Nama Orang Tua": "Nama Ibu", 
          "Kelas": "XII", 
          "Jurusan": "IPS" 
        }
      ];
      
      // Create worksheet with sample data
      const ws = XLSX.utils.json_to_sheet(sampleData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
      
      // Create buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      res.setHeader('Content-Disposition', 'attachment; filename=template_import_siswa.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send file
      res.send(buffer);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "Gagal membuat template" });
    }
  };

  // Server-side PDF generation endpoint
  app.get("/api/certificates/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (isNaN(studentId)) {
        return res.status(400).json({ message: "ID siswa tidak valid" });
      }

      // Check user permissions - siswa can only access their own certificate
      const user = req.user as Express.User;
      if (user.role === 'siswa' && user.studentId !== studentId) {
        return res.status(403).json({ message: "Anda tidak berhak mengakses sertifikat siswa lain" });
      }

      // Get student data
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Siswa tidak ditemukan" });
      }

      // Check if student is verified
      if (student.status !== 'verified') {
        return res.status(403).json({ message: "Siswa belum diverifikasi" });
      }

      // Get settings
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(404).json({ message: "Pengaturan tidak ditemukan" });
      }

      // Check if showing grades is requested
      const showGrades = req.query.showGrades === 'true';

      // Create uploads/certificates directory if it doesn't exist
      if (!fs.existsSync('uploads/certificates')) {
        fs.mkdirSync('uploads/certificates', { recursive: true });
      }

      // Generate PDF filename
      const filename = `certificate_${student.id}_${Date.now()}.pdf`;
      const filePath = path.join('uploads/certificates', filename);

      // Get grades if needed
      let grades = [];
      if (showGrades) {
        const studentGrades = await storage.getStudentGrades(student.id);
        grades = studentGrades.map(grade => ({
          name: grade.subjectName,
          value: grade.value
        }));
      }

      // Calculate average grade if available
      let averageGrade;
      if (grades.length > 0) {
        const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
        averageGrade = Math.round((sum / grades.length) * 100) / 100;
      }

      // Prepare certificate data
      const certificateData: CertificateData = {
        id: student.id,
        nisn: student.nisn,
        nis: student.nis,
        fullName: student.fullName,
        birthPlace: student.birthPlace,
        birthDate: student.birthDate,
        parentName: student.parentName,
        className: student.className,
        certNumber: `${settings.certNumberPrefix || 'SKL'}/${settings.academicYear.replace('/', '-')}/${student.id.toString().padStart(3, '0')}`,
        certNumberPrefix: settings.certNumberPrefix || '',
        certBeforeStudentData: settings.certBeforeStudentData || '',
        certAfterStudentData: settings.certAfterStudentData || '',
        certRegulationText: settings.certRegulationText || '',
        certCriteriaText: settings.certCriteriaText || '',
        issueDate: new Date().toLocaleDateString('id-ID'),
        graduationDate: settings.graduationDate || new Date().toLocaleDateString('id-ID'),
        graduationTime: settings.graduationTime || '',
        headmasterName: settings.headmasterName || '',
        headmasterNip: settings.headmasterNip || '',
        headmasterSignature: settings.headmasterSignature || '',
        schoolName: settings.schoolName || '',
        schoolAddress: settings.schoolAddress || '',
        schoolEmail: settings.schoolEmail || '',
        schoolWebsite: settings.schoolWebsite || '',
        schoolLogo: settings.schoolLogo || '',
        schoolStamp: settings.schoolStamp || '',
        ministryLogo: settings.ministryLogo || '',
        headerImage: settings.headerImage || '',
        useHeaderImage: settings.useHeaderImage || false,
        useDigitalSignature: settings.useDigitalSignature || false,
        cityName: settings.cityName || '',
        provinceName: settings.provinceName || '',
        academicYear: settings.academicYear || '',
        majorName: student.major || 'MIPA',
        showGrades,
        grades,
        averageGrade
      };

      // Generate PDF
      await generateCertificatePDF(certificateData, filePath);

      // Send the file
      res.download(filePath, `SKL_${student.fullName.replace(/\s+/g, '_')}_${showGrades ? 'dengan_nilai' : 'tanpa_nilai'}.pdf`, (err) => {
        if (err) {
          console.error("Error sending PDF:", err);
        }

        // Delete the file after sending
        setTimeout(() => {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error("Error deleting file:", err);
            }
          });
        }, 5000);
      });
    } catch (error) {
      console.error("Error generating certificate:", error);
      res.status(500).json({ message: "Gagal membuat sertifikat" });
    }
  });

  // Generate Excel template for grade import (by class)
  app.get("/api/grades/template-class", requireRole(["admin", "guru"]), async (req, res) => {
    try {
      // Get class name from query
      const className = req.query.className as string;
      
      // Get major from query
      const major = req.query.major as string;
      
      if (!className) {
        return res.status(400).json({ message: "Parameter kelas diperlukan" });
      }

      // Get students in the class
      const query: { className: string; major?: string } = { className };
      if (major) {
        query.major = major;
      }
      
      const students = await storage.getStudents(query);
      
      // Get subjects
      const subjectsQuery: { major?: string } = {};
      if (major) {
        subjectsQuery.major = major;
      }
      
      const subjects = await storage.getSubjects(subjectsQuery);
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare header row with student data columns and subject columns
      const headers = [
        "ID",
        "NISN",
        "NIS",
        "Nama Lengkap",
        ...subjects.map(subject => subject.code) // Use subject codes as column headers
      ];
      
      // Prepare data rows
      const dataRows = students.map(student => {
        const row: any = {
          ID: student.id,
          NISN: student.nisn,
          NIS: student.nis,
          "Nama Lengkap": student.fullName
        };
        
        // Add empty cells for each subject
        subjects.forEach(subject => {
          row[subject.code] = "";
        });
        
        return row;
      });
      
      // Create worksheet with the data
      const ws = XLSX.utils.json_to_sheet(dataRows);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, `Nilai ${className}`);
      
      // Add a subjects reference sheet
      const subjectsData = subjects.map(subject => ({
        code: subject.code,
        name: subject.name,
        group: subject.group,
        credits: subject.credits,
        id: subject.id
      }));
      
      const subjectSheet = XLSX.utils.json_to_sheet(subjectsData);
      XLSX.utils.book_append_sheet(wb, subjectSheet, "Mata Pelajaran");
      
      // Create buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      const fileName = major 
        ? `template_nilai_${className}_${major.replace(/\s+/g, '_')}.xlsx` 
        : `template_nilai_${className}.xlsx`;
      
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send file
      res.send(buffer);
    } catch (error) {
      console.error("Error generating grade template:", error);
      res.status(500).json({ message: "Gagal membuat template nilai" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Create HTTP server
  const httpServer = new Server(app);

  return httpServer;
}