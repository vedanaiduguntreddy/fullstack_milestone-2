/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "job-portal-super-secret";

// --- Mock Database ---
let users = [
  { 
    id: "1", 
    email: "admin@example.com", 
    password: bcrypt.hashSync("admin123", 10), 
    role: "ADMIN",
    name: "System Admin"
  },
  { 
    id: "2", 
    email: "employer@google.com", 
    password: bcrypt.hashSync("employer123", 10), 
    role: "EMPLOYER",
    name: "Google Recruitment"
  },
  { 
    id: "3", 
    email: "student@example.com", 
    password: bcrypt.hashSync("student123", 10), 
    role: "STUDENT",
    name: "John Doe",
    resumeUrl: ""
  }
];

let jobs = [
  { 
    id: "j1", 
    employerId: "2", 
    title: "Senior Frontend Engineer", 
    description: "Build amazing stuff with React and Tailwind.", 
    skills: "React, Tailwind, Node.js", 
    salary: "$120k - $160k", 
    location: "Remote",
    createdAt: new Date().toISOString()
  },
  { 
    id: "j2", 
    employerId: "2", 
    title: "Product Designer", 
    description: "Design beautiful interfaces for millions of users.", 
    skills: "Figma, UX Research", 
    salary: "$100k - $140k", 
    location: "New York, NY",
    createdAt: new Date().toISOString()
  }
];

let applications = [
  {
    id: "a1",
    jobId: "j1",
    studentId: "3",
    status: "PENDING",
    applicantName: "John Doe",
    applicantResume: "resume.pdf",
    appliedAt: new Date().toISOString()
  }
];

// --- Server Setup ---

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = users.find(u => u.id === decoded.id);
      if (!req.user) return res.status(401).json({ message: "User not found" });
      next();
    } catch {
      res.status(401).json({ message: "Invalid token" });
    }
  };

  const authorize = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    };
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", (req, res) => {
    const { email, password, role, name } = req.body;
    if (!email || !password || !role || !name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      password: bcrypt.hashSync(password, 10),
      role,
      name,
      resumeUrl: ""
    };
    users.push(newUser);
    
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: { id: newUser.id, email, role, name } });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role, name: req.user.name, resumeUrl: req.user.resumeUrl } });
  });

  // --- Job Routes ---
  app.get("/api/jobs", (req, res) => {
    const { category, location } = req.query;
    let filteredJobs = [...jobs];
    
    if (location) {
      filteredJobs = filteredJobs.filter(j => j.location.toLowerCase().includes((location as string).toLowerCase()));
    }
    // We can add more filters as needed
    
    res.json(filteredJobs);
  });

  app.post("/api/jobs", authenticate, authorize(["EMPLOYER", "ADMIN"]), (req: any, res) => {
    const { title, description, skills, salary, location } = req.body;
    if (!title || !description || !skills || !salary || !location) {
      return res.status(400).json({ message: "Missing job details" });
    }

    const newJob = {
      id: "j" + Math.random().toString(36).substr(2, 5),
      employerId: req.user.id,
      title,
      description,
      skills,
      salary,
      location,
      createdAt: new Date().toISOString()
    };
    jobs.push(newJob);
    res.status(201).json(newJob);
  });

  app.patch("/api/jobs/:id", authenticate, authorize(["EMPLOYER", "ADMIN"]), (req: any, res) => {
    const { id } = req.params;
    const jobIndex = jobs.findIndex(j => j.id === id);
    if (jobIndex === -1) return res.status(404).json({ message: "Job not found" });
    
    // Check ownership
    if (req.user.role !== "ADMIN" && jobs[jobIndex].employerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    jobs[jobIndex] = { ...jobs[jobIndex], ...req.body };
    res.json(jobs[jobIndex]);
  });

  app.delete("/api/jobs/:id", authenticate, authorize(["EMPLOYER", "ADMIN"]), (req: any, res) => {
    const { id } = req.params;
    const jobIndex = jobs.findIndex(j => j.id === id);
    if (jobIndex === -1) return res.status(404).json({ message: "Job not found" });

    if (req.user.role !== "ADMIN" && jobs[jobIndex].employerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    jobs.splice(jobIndex, 1);
    res.status(204).send();
  });

  // --- Application Routes ---
  app.post("/api/applications", authenticate, authorize(["STUDENT"]), (req: any, res) => {
    const { jobId, resumeUrl } = req.body;
    if (!jobId) return res.status(400).json({ message: "Job ID required" });

    // Check if already applied
    const existing = applications.find(a => a.jobId === jobId && a.studentId === req.user.id);
    if (existing) return res.status(400).json({ message: "Already applied" });

    const newApp = {
      id: "a" + Math.random().toString(36).substr(2, 5),
      jobId,
      studentId: req.user.id,
      status: "PENDING",
      applicantName: req.user.name,
      applicantResume: resumeUrl || req.user.resumeUrl || "No resume provided",
      appliedAt: new Date().toISOString()
    };
    applications.push(newApp);
    res.status(201).json(newApp);
  });

  app.get("/api/applications", authenticate, (req: any, res) => {
    if (req.user.role === "STUDENT") {
      const myApps = applications
        .filter(a => a.studentId === req.user.id)
        .map(a => {
          const job = jobs.find(j => j.id === a.jobId);
          return { ...a, jobTitle: job?.title, employerName: users.find(u => u.id === job?.employerId)?.name };
        });
      return res.json(myApps);
    }

    if (req.user.role === "EMPLOYER") {
      const myJobs = jobs.filter(j => j.employerId === req.user.id);
      const myJobIds = myJobs.map(j => j.id);
      const incomingApps = applications
        .filter(a => myJobIds.includes(a.jobId))
        .map(a => ({
          ...a,
          jobTitle: jobs.find(j => j.id === a.jobId)?.title
        }));
      return res.json(incomingApps);
    }

    if (req.user.role === "ADMIN") {
      return res.json(applications);
    }
  });

  app.patch("/api/applications/:id", authenticate, authorize(["EMPLOYER", "ADMIN"]), (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!["SHORTLISTED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const appIndex = applications.findIndex(a => a.id === id);
    if (appIndex === -1) return res.status(404).json({ message: "Application not found" });

    // Check employer ownership of the job
    const job = jobs.find(j => j.id === applications[appIndex].jobId);
    if (req.user.role !== "ADMIN" && job?.employerId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    applications[appIndex].status = status;
    res.json(applications[appIndex]);
  });

  // --- Profile Routes ---
  app.patch("/api/profile", authenticate, (req: any, res) => {
    const userIndex = users.findIndex(u => u.id === req.user.id);
    users[userIndex] = { ...users[userIndex], ...req.body };
    res.json({ user: { id: users[userIndex].id, email: users[userIndex].email, role: users[userIndex].role, name: users[userIndex].name, resumeUrl: users[userIndex].resumeUrl } });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Job Portal Server running on http://localhost:${PORT}`);
  });
}

startServer();
