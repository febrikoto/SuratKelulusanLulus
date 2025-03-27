import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertStudentSchema, verificationSchema, insertGradeSchema, insertSettingsSchema } from "@shared/schema";

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

  // Settings API endpoints
  app.get("/api/settings", requireAuth, async (req, res) => {
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
          certNumberPrefix: "SKL/2024"
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

  const httpServer = createServer(app);
  return httpServer;
}
