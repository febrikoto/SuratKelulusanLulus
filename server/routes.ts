import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertStudentSchema, verificationSchema, insertGradeSchema, insertSettingsSchema, insertSubjectSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const { requireAuth, requireRole } = setupAuth(app);
  
  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
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

  // CSV Import endpoint
  app.post("/api/students/import", requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      if (req.file.mimetype !== 'text/csv') {
        return res.status(400).json({ message: "Only CSV files are allowed" });
      }
      
      const results: any[] = [];
      const errors: any[] = [];
      
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
            
            const validation = insertStudentSchema.safeParse(studentData);
            
            if (!validation.success) {
              errors.push({ data, errors: validation.error.errors });
              return;
            }
            
            // Check if student already exists
            const existingStudent = await storage.getStudentByNisn(studentData.nisn);
            if (existingStudent) {
              errors.push({ data, error: "Student with this NISN already exists" });
              return;
            }
            
            const newStudent = await storage.createStudent(studentData);
            results.push(newStudent);
          } catch (error) {
            errors.push({ data, error: "Failed to process row" });
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
      res.status(500).json({ message: "Failed to import students" });
    }
  });

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

  // Dashboard stats API
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
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
  app.get("/api/subjects", requireAuth, async (req, res) => {
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

  // Settings API endpoints
  app.get("/api/settings", async (req, res) => {
    try {
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
      
      res.json(settings);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
