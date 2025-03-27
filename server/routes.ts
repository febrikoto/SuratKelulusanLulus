import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertStudentSchema, verificationSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const { requireAuth, requireRole } = setupAuth(app);
  
  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
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

  const httpServer = createServer(app);
  return httpServer;
}
