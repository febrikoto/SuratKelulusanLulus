import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import path from "path";
import fs from "fs";
import os from "os";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertStudentSchema, verificationSchema, insertGradeSchema, insertSettingsSchema, insertSubjectSchema } from "@shared/schema";
import { CertificateData, SubjectGrade } from "@shared/types";
import { generateCertificatePDF } from "./certificate-generator"; 
import { formatDate } from "../client/src/lib/utils";
import * as XLSX from 'xlsx';

export async function registerRoutes(app: Express): Promise<Server> {
  const { requireAuth, requireRole } = setupAuth(app);

  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
  });

  app.get("/api/backup", async (req, res) => {
    try {
      const backupData = {
        message: "Ini adalah backup dari data website Anda.",
      };

      const filePath = path.resolve(__dirname, 'backup.json');
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

      res.download(filePath, 'backup.json', (err) => {
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

      const updatedStudent = await storage.updateStudent(id, req.body);
      if (!updatedStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

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

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // CSV/Excel Import endpoint
  app.post("/api/students/import", requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Tidak ada file yang diupload" });
      }

      const results: any[] = [];
      const errors: any[] = [];

      // Deteksi format file dan proses sesuai format
      if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
        // Parse CSV file
        const stream = Readable.from(req.file.buffer.toString());

        stream
          .pipe(csvParser())
          .on('data', async (data) => {
            try {
              // Map CSV columns to student schema
              const studentData = {
                nisn: data.nisn,
                nis: data.nis,
                fullName: data.fullName,
                birthPlace: data.birthPlace,
                birthDate: data.birthDate,
                parentName: data.parentName,
                className: data.className,
                status: 'pending'
              };

              await processStudentData(studentData, results, errors);
            } catch (error) {
              errors.push({ data, error: "Gagal memproses baris data" });
            }
          })
          .on('end', () => {
            res.json({
              success: true,
              imported: results.length,
              errors: errors.length > 0 ? errors : null
            });
          });
      } else if (
        req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        req.file.originalname.endsWith('.xlsx')
      ) {
        try {
          // Parse Excel file
          const workbook = XLSX.read(req.file.buffer);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert Excel to JSON (skip first 9 rows which are instructions)
          const data = XLSX.utils.sheet_to_json(worksheet, { range: 1 });  // Skip header row

          // Process each row
          for (const row of data) {
            // Skip empty rows
            if (!row['nisn'] && !row['nis'] && !row['fullName']) continue;
            
            try {
              const studentData = {
                nisn: row['nisn']?.toString() || '',
                nis: row['nis']?.toString() || '',
                fullName: row['fullName']?.toString() || '',
                birthPlace: row['birthPlace']?.toString() || '',
                birthDate: row['birthDate']?.toString() || '',
                parentName: row['parentName']?.toString() || '',
                className: row['className']?.toString() || '',
                status: 'pending'
              };

              await processStudentData(studentData, results, errors);
            } catch (error) {
              errors.push({ data: row, error: "Gagal memproses baris data" });
            }
          }
          
          res.json({
            success: true,
            imported: results.length,
            errors: errors.length > 0 ? errors : null
          });
        } catch (error) {
          console.error("Error parsing Excel:", error);
          return res.status(400).json({ message: "Gagal memproses file Excel" });
        }
      } else {
        return res.status(400).json({ message: "Hanya file CSV atau Excel (.xlsx) yang diperbolehkan" });
      }
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Gagal mengimpor data siswa" });
    }
  });

  // Helper function to process student data
  async function processStudentData(studentData: any, results: any[], errors: any[]) {
    const validation = insertStudentSchema.safeParse(studentData);

    if (!validation.success) {
      errors.push({ data: studentData, errors: validation.error.errors });
      return;
    }

    // Check if student already exists
    const existingStudent = await storage.getStudentByNisn(studentData.nisn);
    if (existingStudent) {
      errors.push({ data: studentData, error: "Siswa dengan NISN ini sudah ada" });
      return;
    }

    const newStudent = await storage.createStudent(studentData);
    results.push(newStudent);
  }

  // Verification API
  app.post("/api/students/verify", requireRole(["guru"]), async (req, res) => {
    try {
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

      res.json(updatedStudent);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify student" });
    }
  });

  // Certificate API endpoint for PDF generation
  app.get("/api/certificates/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const showGrades = req.query.showGrades === 'true';

      if (isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID' });
      }

      // Get the student data
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Get settings
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(404).json({ error: 'School settings not found' });
      }

      // Get grades for the student if needed
      let grades: SubjectGrade[] = [];
      let averageGrade = 0;

      if (showGrades) {
        const studentGrades = await storage.getStudentGrades(studentId);

        if (studentGrades && studentGrades.length > 0) {
          // Use grade.subjectName directly as we store it in the grade object
          grades = studentGrades.map((grade) => ({
            name: grade.subjectName,
            value: grade.value
          }));

          // Calculate average
          const sum = studentGrades.reduce((acc, grade) => acc + grade.value, 0);
          averageGrade = sum / studentGrades.length;
        }
      }

      // Compose the certificate data
      const certificateData: CertificateData = {
        id: student.id,
        nisn: student.nisn,
        nis: student.nis,
        fullName: student.fullName,
        birthPlace: student.birthPlace,
        birthDate: student.birthDate,
        parentName: student.parentName,
        className: student.className,
        certNumber: `${settings.certNumberPrefix || ''}${student.id}/SKL/${new Date().getFullYear()}`,
        certNumberPrefix: settings.certNumberPrefix || undefined,
        certBeforeStudentData: settings.certBeforeStudentData || undefined,
        certAfterStudentData: settings.certAfterStudentData || undefined,
        certRegulationText: settings.certRegulationText || undefined,
        certCriteriaText: settings.certCriteriaText || undefined,
        issueDate: new Date().toISOString(),
        graduationDate: settings.graduationDate || new Date().toISOString().split('T')[0],
        graduationTime: settings.graduationTime || undefined,
        headmasterName: settings.headmasterName,
        headmasterNip: settings.headmasterNip,
        headmasterSignature: settings.headmasterSignature || undefined,
        schoolName: settings.schoolName,
        schoolAddress: settings.schoolAddress,
        schoolEmail: settings.schoolEmail || undefined,
        schoolWebsite: settings.schoolWebsite || undefined,
        schoolLogo: settings.schoolLogo || undefined,
        schoolStamp: settings.schoolStamp || undefined,
        ministryLogo: settings.ministryLogo || undefined,
        useDigitalSignature: settings.useDigitalSignature !== undefined ? settings.useDigitalSignature : true,
        cityName: settings.cityName || 'Jakarta',
        provinceName: settings.provinceName || 'DKI Jakarta',
        academicYear: settings.academicYear,
        showGrades: showGrades,
        majorName: "MIPA", // Default to MIPA since majorName is not in settings
        grades: grades,
        averageGrade: averageGrade
      };

      // Generate a PDF file and send it as response
      const filePath = path.join(os.tmpdir(), `certificate-${student.id}.pdf`);

      await generateCertificatePDF(certificateData, filePath);

      res.download(filePath, `SKL-${student.fullName.replace(/\s+/g, '-')}-${student.nisn}.pdf`, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).json({ error: 'Error sending certificate file' });
        }

        // Remove the temporary file after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error removing temporary file:', unlinkErr);
          }
        });
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      res.status(500).json({ error: 'Failed to generate certificate' });
    }
  });

  // Dashboard stats API with caching
  let cachedStats: any = null;
  let statsCacheTime = 0;
  const STATS_CACHE_TTL = 1 * 60 * 1000; // 1 minute in milliseconds

  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const now = Date.now();

      // Return cached stats if valid
      if (cachedStats && (now - statsCacheTime < STATS_CACHE_TTL)) {
        return res.json(cachedStats);
      }

      // Cache expired or doesn't exist, fetch fresh data
      const stats = await storage.getDashboardStats();

      // Update cache
      cachedStats = stats;
      statsCacheTime = now;

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Grades API endpoints
  app.get("/api/students/:id/grades", requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      if (isNaN(studentId)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const grades = await storage.getStudentGrades(studentId);
      res.json(grades);
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil nilai siswa" });
    }
  });

  // New general endpoint for adding grades
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
                    major: null // No specific major
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

        res.status(201).json({ 
          message: 'Nilai kelas berhasil diimport',
          success: savedGrades.length,
          total: gradesData.length
        });
      } else {
        res.status(400).json({ message: "Tidak ada nilai yang valid untuk diimport" });
      }
    } catch (error: any) {
      console.error("Error importing class grades:", error);
      res.status(500).json({ message: "Gagal mengimport nilai kelas: " + error.message });
    }
  });

  // Settings API endpoints with caching
  let cachedSettings: any = null;
  let settingsCacheTime = 0;
  const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  app.get("/api/settings", async (req, res) => {
    try {
      const now = Date.now();

      // Return cached settings if valid
      if (cachedSettings && (now - settingsCacheTime < SETTINGS_CACHE_TTL)) {
        return res.json(cachedSettings);
      }

      // Cache expired or doesn't exist, fetch fresh data
      let settings = await storage.getSettings();
      if (!settings) {
        // Create default settings if none exists
        const defaultSettings = {
          schoolName: "SMA Negeri 1",
          schoolAddress: "Jl. Pendidikan No. 1",
          schoolLogo: "",
          ministryLogo: "",
          headmasterName: "Drs. Suparman, M.Pd.",
          headmasterNip: "196501011990011001",
          headmasterSignature: "",
          schoolStamp: "",
          certHeader: "SURAT KETERANGAN LULUS",
          certFooter: "Surat ini berlaku sebagai bukti kelulusan sampai ijazah diterbitkan.",
          certBeforeStudentData: "Yang bertanda tangan di bawah ini, Kepala Sekolah Menengah Atas, menerangkan bahwa:",
          certAfterStudentData: "telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.",
          academicYear: "2023/2024",
          graduationDate: "2024-05-03",
          graduationTime: "10:00",
          cityName: "Jakarta",
          provinceName: "DKI Jakarta",
          certNumberPrefix: "SKL/2024",
          majorList: "semua,MIPA,IPS,BAHASA",
          classList: "XII IPA 1,XII IPA 2,XII IPS 1,XII IPS 2"
        };

        settings = await storage.saveSettings(defaultSettings);
      }

      // Update cache
      cachedSettings = settings;
      settingsCacheTime = now;

      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", requireRole(["admin"]), async (req, res) => {
    try {
      // Validasi input menggunakan schema Zod
      const parsedData = insertSettingsSchema.safeParse(req.body);

      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid settings data", 
          errors: parsedData.error.format() 
        });
      }

      const savedSettings = await storage.saveSettings(parsedData.data);

      // Invalidate settings cache
      cachedSettings = savedSettings;
      settingsCacheTime = Date.now();

      res.status(201).json(savedSettings);
    } catch (error) {
      console.error("Save settings error:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  app.put("/api/settings", requireRole(["admin"]), async (req, res) => {
    try {
      // Validasi input menggunakan schema Zod
      const parsedData = insertSettingsSchema.partial().safeParse(req.body);

      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid settings data", 
          errors: parsedData.error.format() 
        });
      }

      const updatedSettings = await storage.updateSettings(parsedData.data);
      if (!updatedSettings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      // Invalidate settings cache
      cachedSettings = updatedSettings;
      settingsCacheTime = Date.now();

      res.json(updatedSettings);
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Welcome animation status endpoint
  app.post("/api/user/welcome-status", requireAuth, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const hasSeenWelcome = req.body.hasSeenWelcome === true;

      const updatedUser = await storage.updateUserWelcomeStatus(user.id, hasSeenWelcome);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, hasSeenWelcome: updatedUser.hasSeenWelcome });
    } catch (error) {
      res.status(500).json({ message: "Failed to update welcome status" });
    }
  });

  // Bulk delete endpoint (admin only)
  app.post("/api/admin/bulk-delete", requireRole(["admin"]), async (req, res) => {
    try {
      const { targets } = req.body;

      if (!targets || !Array.isArray(targets) || targets.length === 0) {
        return res.status(400).json({ message: "No targets specified for deletion" });
      }

      const results = {
        deleted: 0,
        errors: 0,
        details: {} as Record<string, { success: number, failed: number }>
      };

      // Process each target type
      for (const target of targets) {
        results.details[target] = { success: 0, failed: 0 };

        if (target === 'students') {
          try {
            const students = await storage.getStudents();
            for (const student of students) {
              try {
                await storage.deleteStudent(student.id);
                results.deleted++;
                results.details[target].success++;
              } catch (err) {
                results.errors++;
                results.details[target].failed++;
              }
            }
          } catch (err) {
            results.errors++;
          }
        } 
        else if (target === 'subjects') {
          try {
            const subjects = await storage.getSubjects();
            for (const subject of subjects) {
              try {
                await storage.deleteSubject(subject.id);
                results.deleted++;
                results.details[target].success++;
              } catch (err) {
                results.errors++;
                results.details[target].failed++;
              }
            }
          } catch (err) {
            results.errors++;
          }
        } 
        else if (target === 'grades') {
          try {
            // For grades, we need to get all students and their grades
            const students = await storage.getStudents();
            for (const student of students) {
              try {
                const grades = await storage.getStudentGrades(student.id);
                for (const grade of grades) {
                  try {
                    await storage.deleteGrade(grade.id);
                    results.deleted++;
                    results.details[target].success++;
                  } catch (err) {
                    results.errors++;
                    results.details[target].failed++;
                  }
                }
              } catch (err) {
                results.errors++;
              }
            }
          } catch (err) {
            results.errors++;
          }
        } 
        else if (target === 'logs') {
          // Logs are not implemented yet, but we'll include it for future use
          results.details[target].success = 0;
          results.details[target].failed = 0;
          // Would delete logs here if implemented
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ message: "Failed to perform bulk delete operation" });
    }
  });

  // Pastikan direktori untuk file sementara PDF ada
  if (!fs.existsSync('uploads/certificates')) {
    fs.mkdirSync('uploads/certificates', { recursive: true });
  }

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
        return res.status(500).json({ message: "Pengaturan sekolah tidak ditemukan" });
      }

      // Get showGrades from query param
      const showGrades = req.query.showGrades === 'true';

      // Get grades if needed
      let gradeData: SubjectGrade[] = [];
      let averageGrade: number | undefined = undefined;

      if (showGrades) {
        const studentGrades = await storage.getStudentGrades(studentId);

        if (studentGrades && studentGrades.length > 0) {
          // Format grades as SubjectGrade format
          gradeData = studentGrades.map(g => ({
            name: g.subjectName,
            value: g.value
          }));

          // Calculate average grade
          const sum = studentGrades.reduce((acc, grade) => acc + grade.value, 0);
          averageGrade = Number((sum / studentGrades.length).toFixed(2));

          // Log untuk debugging
          console.log(`Grades count: ${gradeData.length}, Average: ${averageGrade}`);
        } else {
          console.log('No grades found for student');

          // Jika tidak ada grades di database, gunakan sample data (hanya untuk development)
          gradeData = [
            { name: "Pendidikan Agama dan Budi Pekerti", value: 87.52 },
            { name: "Pendidikan Pancasila dan Kewarganegaraan", value: 90.40 },
            { name: "Bahasa Indonesia", value: 85.04 },
            { name: "Matematika", value: 87.92 },
            { name: "Sejarah Indonesia", value: 87.52 },
            { name: "Bahasa Inggris", value: 86.04 },
            { name: "Seni Budaya", value: 89.28 },
            { name: "Pendidikan Jasmani, Olah Raga, dan Kesehatan", value: 91.92 },
            { name: "Prakarya dan Kewirausahaan", value: 91.20 },
            { name: "Matematika Peminatan", value: 85.32 },
            { name: "Biologi", value: 88.56 },
            { name: "Fisika", value: 87.64 },
            { name: "Kimia", value: 88.60 },
            { name: "Sosiologi Peminatan", value: 89.04 },
            { name: "Bahasa Jepang", value: 87.75 }
          ];

          // Calculate average for sample data
          const sum = gradeData.reduce((acc, grade) => acc + grade.value, 0);
          averageGrade = Number((sum / gradeData.length).toFixed(2));
        }
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
        certNumber: String(student.id).padStart(3, '0'),
        certNumberPrefix: settings.certNumberPrefix || '',
        certBeforeStudentData: settings.certBeforeStudentData || '',
        certAfterStudentData: settings.certAfterStudentData || '',
        certRegulationText: settings.certRegulationText || '',
        certCriteriaText: settings.certCriteriaText || '',
        issueDate: formatDate(new Date().toISOString()),
        graduationDate: settings.graduationDate || formatDate(new Date().toISOString()),
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
        useDigitalSignature: settings.useDigitalSignature !== undefined ? settings.useDigitalSignature : true,
        cityName: settings.cityName || '',
        provinceName: settings.provinceName || '',
        academicYear: settings.academicYear || '',
        majorName: settings.majorList?.split(',')[0] || 'MIPA',
        showGrades,
        grades: gradeData,
        averageGrade
      };

      // Generate a unique filename
      const filename = `certificate_${student.nisn}_${Date.now()}.pdf`;
      const filePath = path.join(process.cwd(), 'uploads', 'certificates', filename);

      // Generate PDF
      await generateCertificatePDF(certificateData, filePath);

      // Send the file
      res.download(filePath, `SKL_${student.fullName.replace(/\s+/g, '_')}_${showGrades ? 'dengan_nilai' : 'tanpa_nilai'}.pdf`, (err) => {
        if (err) {
          console.error("Error sending PDF:", err);
        }

        // Delete the temporary file after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting temporary PDF:", unlinkErr);
          }
        });
      });

    } catch (error) {
      console.error("Error generating certificate:", error);
      res.status(500).json({ message: "Gagal membuat sertifikat" });
    }
  });

  // Generate Excel Import Template
  // Function to generate Excel template
  const generateExcelTemplate = async (req: Request, res: Response) => {
    try {
      // Support both query parameters: className and class
      let className = req.query.className as string;
      if (!className) {
        className = req.query.class as string;
      }
      
      if (!className) {
        return res.status(400).json({ message: "Nama kelas diperlukan" });
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create headers and sample data
      const headers = [
        "nisn", 
        "nis", 
        "fullName", 
        "birthPlace", 
        "birthDate", 
        "parentName", 
        "className"
      ];
      
      // Create sample rows with explanations
      const rows = [
        [
          // Sample data with explanations
          "0123456789", // NISN (10 digit)
          "123456", // NIS (6 digit)
          "Nama Lengkap Siswa", // Nama lengkap
          "Jakarta", // Tempat lahir
          "2005-05-20", // Tanggal lahir (format: YYYY-MM-DD)
          "Nama Orang Tua", // Nama orang tua
          className // Kelas
        ],
        [
          // Empty row for user to fill
          "", "", "", "", "", "", className
        ]
      ];
      
      // Combine headers and rows
      const data = [headers, ...rows];
      
      // Create worksheet from data
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Add column widths for better readability
      const colWidths = [
        { wch: 15 }, // nisn
        { wch: 10 }, // nis
        { wch: 30 }, // fullName
        { wch: 15 }, // birthPlace
        { wch: 15 }, // birthDate
        { wch: 25 }, // parentName
        { wch: 10 }  // className
      ];
      
      ws['!cols'] = colWidths;
      
      // Add comments/notes to cells - Menggunakan format cell address (A1, B1, etc.)
      if (!ws.A1) ws.A1 = {};
      if (!ws.B1) ws.B1 = {};
      if (!ws.C1) ws.C1 = {};
      if (!ws.D1) ws.D1 = {};
      if (!ws.E1) ws.E1 = {};
      if (!ws.F1) ws.F1 = {};
      if (!ws.G1) ws.G1 = {};
      
      // Menambahkan keterangan menggunakan metadata di workbook
      const comments = {
        A1: { text: "NISN harus 10 digit angka", author: "Petunjuk" },
        B1: { text: "NIS harus diisi, minimal 3 karakter", author: "Petunjuk" },
        C1: { text: "Nama lengkap siswa", author: "Petunjuk" },
        D1: { text: "Tempat lahir siswa", author: "Petunjuk" },
        E1: { text: "Format tanggal: YYYY-MM-DD (tahun-bulan-tanggal)", author: "Petunjuk" },
        F1: { text: "Nama orang tua/wali siswa", author: "Petunjuk" },
        G1: { text: "Kelas siswa, sudah terisi otomatis", author: "Petunjuk" }
      };
      
      // Menambahkan comments ke worksheet
      if (!ws.comments) ws.comments = [];
      for (const [cellAddr, comment] of Object.entries(comments)) {
        ws.comments.push({ 
          ref: cellAddr, 
          author: comment.author,
          text: comment.text
        });
      }
      
      // Membuat deskripsi di baris pertama
      ws.A4 = { t: "s", v: "PETUNJUK:" };
      ws.A5 = { t: "s", v: "1. Baris 1 berisi header, jangan diubah" };
      ws.A6 = { t: "s", v: "2. Baris 2 berisi contoh data, boleh diubah" };
      ws.A7 = { t: "s", v: "3. Baris 3 dan seterusnya untuk data baru" };
      ws.A8 = { t: "s", v: "4. Pastikan format tanggal adalah YYYY-MM-DD (tahun-bulan-tanggal)" };
      ws.A9 = { t: "s", v: "5. NISN wajib 10 digit angka" };
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
      
      // Generate buffer
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      // Set response headers
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=Template_Import_Siswa_${className}.xlsx`);
      
      // Send buffer as response
      res.send(buffer);
    } catch (error) {
      console.error("Error generating Excel template:", error);
      res.status(500).json({ message: "Gagal membuat template Excel" });
    }
  };

  // Set up both endpoints to use the same handler
  app.get("/api/students/template/excel", requireRole(["admin"]), generateExcelTemplate);
  
  // Alias for backward compatibility
  app.get("/api/export/student-template", requireRole(["admin"]), generateExcelTemplate);

  const httpServer = createServer(app);
  return httpServer;
}