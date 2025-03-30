import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User, loginSchema } from "@shared/schema";

declare global {
  namespace Express {
    // Extended User interface with all properties from schema
    interface User {
      id: number;
      username: string;
      password: string;
      fullName: string;
      role: 'admin' | 'guru' | 'siswa';
      studentId: number | null;
      hasSeenWelcome: boolean;
      createdAt: Date;
    }
  }
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Role-based middleware
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = req.user as User;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "You don't have permission to access this resource" });
    }
    
    next();
  };
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "skl-application-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await storage.comparePasswords(password, user.password))) {
          return done(null, false, { message: "Username atau password salah" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ message: "Invalid login data", errors: validation.error.errors });
    }

    passport.authenticate("local", (err: Error, user: User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      
      // Check if role matches
      if (user.role !== req.body.role) {
        return res.status(403).json({ message: "Unauthorized role access" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          studentId: user.studentId,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      studentId: user.studentId,
    });
  });

  // The middleware functions are now exported at the top of the file
}
