/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  User, 
  LogOut, 
  Plus, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ChevronRight,
  Filter,
  Users,
  Building2,
  MoreVertical,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDate } from "./lib/utils";
import { User as UserType, Job, Application, AuthState, UserRole } from "./types";

// --- Global API Helper ---
const api = {
  get: async (url: string, token?: string) => {
    const res = await fetch(url, {
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async (url: string, body: any, token?: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "" 
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  patch: async (url: string, body: any, token?: string) => {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "" 
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  delete: async (url: string, token?: string) => {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    });
    if (!res.ok) throw new Error(await res.text());
  }
};

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, isLoading: true });
  const [view, setView] = useState<"HOME" | "LOGIN" | "REGISTER" | "DASHBOARD" | "APPLICATIONS" | "MY_JOBS">("HOME");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPostingJob, setIsPostingJob] = useState(false);

  // --- Auth Logic ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.get("/api/auth/me", token)
        .then(data => {
          setAuth({ user: data.user, token, isLoading: false });
          setView("DASHBOARD");
        })
        .catch(() => {
          localStorage.removeItem("token");
          setAuth({ user: null, token: null, isLoading: false });
        });
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (auth.token) {
      fetchJobs();
      fetchApps();
    } else {
      // Unauthenticated search
      fetchJobs();
    }
  }, [auth.token]);

  const fetchJobs = async () => {
    try {
      const data = await api.get("/api/jobs");
      setJobs(data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    }
  };

  const fetchApps = async () => {
    if (!auth.token) return;
    try {
      const data = await api.get("/api/applications", auth.token);
      setApps(data);
    } catch (err) {
      console.error("Failed to fetch applications", err);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setAuth({ user: null, token: null, isLoading: false });
    setView("HOME");
  };

  // --- Render Helpers ---
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-secondary">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar auth={auth} view={view} setView={setView} logout={logout} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {view === "HOME" && (
            <LandingPage key="home" setView={setView} jobs={jobs} />
          )}
          
          {(view === "LOGIN" || view === "REGISTER") && (
            <AuthView 
              key="auth" 
              type={view} 
              onAuth={(user, token) => {
                localStorage.setItem("token", token);
                setAuth({ user, token, isLoading: false });
                setView("DASHBOARD");
              }}
              setView={setView}
            />
          )}

          {view === "DASHBOARD" && auth.user && (
            auth.user.role === "STUDENT" ? (
              <StudentDashboard 
                key="student-db" 
                auth={auth} 
                jobs={jobs} 
                apps={apps}
                refreshApps={fetchApps}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            ) : (
              <EmployerDashboard 
                key="employer-db" 
                auth={auth} 
                jobs={jobs} 
                apps={apps}
                refreshJobs={fetchJobs}
                refreshApps={fetchApps}
                setView={setView}
              />
            )
          )}

          {view === "APPLICATIONS" && (
             <MyApplications key="my-apps" apps={apps} role={auth.user?.role || "STUDENT"} />
          )}

          {view === "MY_JOBS" && auth.user?.role === "EMPLOYER" && (
            <EmployerJobs key="my-jobs" jobs={jobs.filter(j => j.employerId === auth.user?.id)} refreshJobs={fetchJobs} auth={auth} />
          )}
        </AnimatePresence>
      </main>
      
      <footer className="mt-20 border-t border-gray-200 py-12 text-center text-sm text-gray-500">
        <p>&copy; 2026 Job Portal For Management System. Generated by Naidu.</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="#" className="hover:text-brand-accent transition-colors">Privacy</a>
          <a href="#" className="hover:text-brand-accent transition-colors">Terms</a>
          <a href="#" className="hover:text-brand-accent transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-Components ---

function Navbar({ auth, view, setView, logout }: { auth: AuthState, view: string, setView: any, logout: any }) {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(auth.user ? "DASHBOARD" : "HOME")}>
            <div className="bg-brand-primary p-1.5 rounded-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Hirify.</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <NavLink active={view === "DASHBOARD"} onClick={() => setView("DASHBOARD")}>Explore</NavLink>
            {auth.user?.role === "STUDENT" && (
              <NavLink active={view === "APPLICATIONS"} onClick={() => setView("APPLICATIONS")}>My Applications</NavLink>
            )}
            {auth.user?.role === "EMPLOYER" && (
              <NavLink active={view === "MY_JOBS"} onClick={() => setView("MY_JOBS")}>Job Postings</NavLink>
            )}
          </div>

          <div className="flex items-center gap-4">
            {auth.user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{auth.user.name}</p>
                  <p className="text-xs text-brand-accent font-semibold">{auth.user.role}</p>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-brand-primary rounded-xl hover:bg-gray-100 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setView("LOGIN")}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-brand-primary"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setView("REGISTER")}
                  className="px-4 py-2 text-sm font-medium bg-brand-primary text-white rounded-xl shadow-lg shadow-gray-200 hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  Join Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "text-sm font-medium transition-all duration-200 relative py-2",
        active ? "text-brand-primary" : "text-gray-400 hover:text-brand-primary"
      )}
    >
      {children}
      {active && (
        <motion.div 
          layoutId="nav-underline" 
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" 
        />
      )}
    </button>
  );
}

function LandingPage({ setView, jobs, key }: { setView: any, jobs: Job[], key?: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-16 py-12"
    >
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider"
        >
          <TrendingUp className="w-3 h-3" />
          The Future of Hiring is here
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight">
          Find your next <br />
          <span className="text-brand-accent">dream career.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Connect with top employers and students globally. A streamlined platform for managing job cycles effortlessly.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <button 
            onClick={() => setView("REGISTER")}
            className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-semibold shadow-xl shadow-gray-200 flex items-center gap-2 group hover:-translate-y-1 transition-all"
          >
            Start Applying
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => setView("LOGIN")}
            className="px-8 py-4 bg-white border border-gray-200 text-brand-primary rounded-2xl font-semibold hover:bg-gray-50 transition-all"
          >
            Employer Login
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-12">
        <StatCard icon={<Users />} label="Active Seekers" value="12k+" />
        <StatCard icon={<Building2 />} label="Companies" value="450+" />
        <StatCard icon={<Briefcase />} label="Jobs Posted" value="8.4k" />
        <StatCard icon={<CheckCircle2 />} label="Hired" value="2.1k" />
      </div>

      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold">Latest Job Openings</h2>
            <p className="text-gray-500">Discover new opportunities posted recently</p>
          </div>
          <button onClick={() => setView("LOGIN")} className="text-brand-accent font-semibold flex items-center gap-1 hover:underline">
            View all 2,340 jobs <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.slice(0, 4).map((job, i) => (
            <LandingJobCard key={job.id} job={job} index={i} onClick={() => setView("LOGIN")} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="glass-card p-6 space-y-2">
      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

function LandingJobCard({ job, index, onClick, key }: { job: Job, index: number, onClick: () => void, key?: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index }}
      onClick={onClick}
      className="glass-card p-6 flex items-start gap-4 hover:border-brand-accent transition-all cursor-pointer group"
    >
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
        <Briefcase className="w-6 h-6 text-gray-400 group-hover:text-brand-accent transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold truncate">{job.title}</h3>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3" /> {job.location} • {job.salary}
        </p>
        <div className="flex gap-2 mt-4">
          {job.skills.split(",").slice(0, 2).map((s, i) => (
            <span key={i} className="px-3 py-1 bg-gray-100 text-[10px] font-bold uppercase tracking-wider rounded-lg text-gray-500">
              {s.trim()}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function AuthView({ type, onAuth, setView, key }: { type: "LOGIN" | "REGISTER", onAuth: (u: UserType, t: string) => void, setView: any, key?: any }) {
  const [formData, setFormData] = useState({ email: "", password: "", role: "STUDENT" as UserRole, name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = type === "LOGIN" ? "/api/auth/login" : "/api/auth/register";
      const data = await api.post(endpoint, formData);
      onAuth(data.user, data.token);
    } catch (err: any) {
      const msg = JSON.parse(err.message).message;
      setError(msg || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-md mx-auto py-12"
    >
      <div className="glass-card p-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{type === "LOGIN" ? "Welcome Back" : "Create Account"}</h2>
          <p className="text-sm text-gray-500">
            {type === "LOGIN" ? "New to Hirify?" : "Already have an account?"}{" "}
            <button 
              onClick={() => setView(type === "LOGIN" ? "REGISTER" : "LOGIN")}
              className="text-brand-accent font-semibold hover:underline"
            >
              {type === "LOGIN" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "REGISTER" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Full Name</label>
                <input 
                  required
                  type="text"
                  placeholder="enter your name "
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-brand-accent focus:outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Role</label>
                <div className="grid grid-cols-2 gap-2">
                   {["STUDENT", "EMPLOYER"].map((r) => (
                     <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r as UserRole })}
                        className={cn(
                          "px-4 py-3 text-sm font-semibold rounded-xl border transition-all",
                          formData.role === r ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        )}
                     >
                       {r === "STUDENT" ? "Job Seeker" : "Employer"}
                     </button>
                   ))}
                </div>
              </div>
            </>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Email Address</label>
            <input 
              required
              type="email"
              placeholder="example@email.com"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-brand-accent focus:outline-none transition-all"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Password</label>
            <input 
              required
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-brand-accent focus:outline-none transition-all"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <button 
            disabled={loading}
            className="w-full py-4 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-gray-200 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70"
          >
            {loading ? "Authenticating..." : type === "LOGIN" ? "Sign In" : "Register"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

function StudentDashboard({ auth, jobs, apps, refreshApps, searchQuery, setSearchQuery, key }: { auth: AuthState, jobs: Job[], apps: Application[], refreshApps: () => void, searchQuery: string, setSearchQuery: any, key?: any }) {
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => 
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.skills.toLowerCase().includes(searchQuery.toLowerCase()) || 
      j.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [jobs, searchQuery]);

  const [applyingId, setApplyingId] = useState<string | null>(null);

  const applyForJob = async (jobId: string) => {
    if (!auth.token) return;
    setApplyingId(jobId);
    try {
      await api.post("/api/applications", { jobId }, auth.token);
      alert("Application submitted successfully!");
      refreshApps();
    } catch (err: any) {
      const msg = JSON.parse(err.message).message;
      alert(msg || "Failed to apply");
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hello, {auth.user?.name}</h1>
          <p className="text-gray-500">Discover your next opportunity among {jobs.length} listed roles.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
           <div className="pl-3 py-2 flex items-center">
             <Search className="w-5 h-5 text-gray-400" />
           </div>
           <input 
            type="text"
            placeholder="Search by title, skills, or location..."
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
           />
           <button className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest">
             Search
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Available Jobs
            <span className="px-2 py-0.5 bg-gray-100 text-xs rounded-full">{filteredJobs.length}</span>
          </h2>
          {filteredJobs.length === 0 ? (
            <div className="glass-card p-12 text-center text-gray-400">
               <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
               <p>No jobs found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map((job) => {
                const isApplied = apps.some(a => a.jobId === job.id);
                return (
                  <div key={job.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center gap-6 group hover:border-brand-accent/50 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                         <h3 className="text-lg font-bold truncate group-hover:text-brand-accent transition-colors">{job.title}</h3>
                         <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-lg uppercase">New</span>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {job.salary}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDate(job.createdAt)}</span>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {job.skills.split(",").map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-gray-50 text-[10px] font-bold uppercase tracking-wider rounded-lg text-gray-400 border border-gray-100">
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button 
                        disabled={isApplied || applyingId === job.id}
                        onClick={() => applyForJob(job.id)}
                        className={cn(
                          "px-6 py-3 rounded-xl font-bold text-sm transition-all",
                          isApplied 
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed flex items-center gap-2" 
                            : "bg-brand-primary text-white shadow-lg shadow-gray-200 hover:-translate-y-1 active:scale-95"
                        )}
                      >
                        {isApplied ? (
                          <><CheckCircle2 className="w-4 h-4" /> Applied</>
                        ) : applyingId === job.id ? "Applying..." : "Apply Now"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
           <h2 className="text-xl font-bold">Quick Insights</h2>
           <div className="grid gap-4">
              <InsightCard 
                icon={<FileText className="text-blue-500"/>} 
                label="Active Applications" 
                value={apps.length.toString()} 
                sub="Keep track of your journey"
              />
              <InsightCard 
                icon={<Bell className="text-orange-500" />} 
                label="Interviews Scheduled" 
                value="0" 
                sub="Prepare for success"
              />
           </div>

           <div className="glass-card p-6 space-y-4">
             <h3 className="font-bold">Resume Management</h3>
             <p className="text-sm text-gray-500">Your resume is your ticket to your next job. Keep it updated.</p>
             <button className="w-full py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:bg-white hover:border-brand-accent transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Upload New Resume
             </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function InsightCard({ icon, label, value, sub }: { icon: any, label: string, value: string, sub: string }) {
  return (
    <div className="glass-card p-5 flex items-start gap-4">
      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold leading-none my-1">{value}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{sub}</p>
      </div>
    </div>
  );
}

function MyApplications({ apps, role, key }: { apps: Application[], role: UserRole, key?: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{role === "STUDENT" ? "My Applications" : "Application Tracking"}</h1>
        <div className="text-sm text-gray-500">Total: {apps.length}</div>
      </div>

      {apps.length === 0 ? (
        <div className="glass-card p-20 text-center space-y-4">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
             <FileText className="w-10 h-10 text-gray-200" />
           </div>
           <h3 className="text-xl font-bold">No applications found</h3>
           <p className="text-gray-500 max-w-xs mx-auto">You haven't applied for any jobs yet. Start exploring now!</p>
        </div>
      ) : (
        <div className="overflow-hidden glass-card">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Position & Employer</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Date Applied</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 shadow-sm">Resume</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{app.jobTitle}</p>
                    <p className="text-sm text-gray-500">{app.employerName || "Hiring Corp"}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(app.appliedAt)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-brand-accent font-medium hover:underline cursor-pointer flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> View
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    PENDING: "bg-orange-50 text-orange-600 border-orange-100",
    SHORTLISTED: "bg-green-50 text-green-600 border-green-100",
    REJECTED: "bg-red-50 text-red-600 border-red-100"
  };
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      styles[status as keyof typeof styles]
    )}>
      {status}
    </span>
  );
}

function EmployerDashboard({ auth, jobs, apps, refreshJobs, refreshApps, setView, key }: any) {
  const myJobs = jobs.filter((j: any) => j.employerId === auth.user.id);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const stats = useMemo(() => ({
    totalJobs: myJobs.length,
    activeApps: apps.length,
    shortlisted: apps.filter((a: any) => a.status === "SHORTLISTED").length,
  }), [myJobs, apps]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employer Portal</h1>
          <p className="text-gray-500">Managing {auth.user.name}'s recruitment funnel</p>
        </div>
        <button 
          onClick={() => setView("MY_JOBS")}
          className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-xl shadow-gray-200 flex items-center gap-2 hover:-translate-y-1 transition-all"
        >
          <Plus className="w-4 h-4" /> Post New Job
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Briefcase />} label="Jobs Posted" value={stats.totalJobs.toString()} />
        <StatCard icon={<Users />} label="Total Applicants" value={stats.activeApps.toString()} />
        <StatCard icon={<CheckCircle2 />} label="Shortlisted" value={stats.shortlisted.toString()} />
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent Applications</h2>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>
        </div>

        {apps.length === 0 ? (
          <div className="glass-card p-20 text-center text-gray-400">
             <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
             <p>No applicants yet. Keep your job descriptions inviting!</p>
          </div>
        ) : (
          <div className="grid gap-4">
             {apps.map((app: any) => (
               <ApplicantCard key={app.id} app={app} auth={auth} refreshApps={refreshApps} />
             ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ApplicantCard({ app, auth, refreshApps, key }: { app: Application, auth: AuthState, refreshApps: () => void, key?: any }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (status: string) => {
    if (!auth.token) return;
    setIsUpdating(true);
    try {
      await api.patch(`/api/applications/${app.id}`, { status }, auth.token);
      refreshApps();
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-brand-accent/30 transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">
          {app.applicantName[0]}
        </div>
        <div>
          <h3 className="font-bold">{app.applicantName}</h3>
          <p className="text-sm text-gray-500">Applied for: <span className="font-semibold text-gray-700">{app.jobTitle}</span></p>
          <p className="text-xs text-brand-accent font-bold mt-1 uppercase tracking-wider">{formatDate(app.appliedAt)}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
           <StatusBadge status={app.status} />
        </div>
        <div className="h-8 w-px bg-gray-200 hidden md:block" />
        <div className="flex gap-2">
          {app.status === "PENDING" ? (
             <>
               <button 
                disabled={isUpdating}
                onClick={() => updateStatus("SHORTLISTED")}
                className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50"
               >
                 Shortlist
               </button>
               <button 
                disabled={isUpdating}
                onClick={() => updateStatus("REJECTED")}
                className="px-4 py-2 bg-white border border-gray-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
               >
                 Reject
               </button>
             </>
          ) : (
            <button 
              disabled={isUpdating}
              onClick={() => updateStatus("PENDING")}
              className="px-4 py-2 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Reset Status
            </button>
          )}
          <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-brand-primary hover:bg-white border border-transparent hover:border-gray-200 transition-all">
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployerJobs({ jobs, refreshJobs, auth, key }: { jobs: Job[], refreshJobs: () => void, auth: AuthState, key?: any }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", skills: "", salary: "", location: "" });

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token) return;
    setLoading(true);
    try {
      await api.post("/api/jobs", formData, auth.token);
      setShowModal(false);
      setFormData({ title: "", description: "", skills: "", salary: "", location: "" });
      refreshJobs();
      alert("Job posted successfully!");
    } catch (err) {
      alert("Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!auth.token || !window.confirm("Are you sure?")) return;
    try {
      await api.delete(`/api/jobs/${id}`, auth.token);
      refreshJobs();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Job Postings</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold flex items-center gap-2 hover:-translate-y-1 transition-all shadow-lg shadow-gray-200"
        >
          <Plus className="w-4 h-4" /> Create New
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="glass-card p-6 space-y-4 hover:border-brand-accent transition-all relative group">
            <button 
               onClick={() => handleDelete(job.id)}
               className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">{job.title}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{formatDate(job.createdAt)}</p>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{job.description}</p>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
               <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
               <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {job.salary}</span>
            </div>
            <div className="pt-4 flex gap-2">
              <button className="px-4 py-2 bg-gray-50 text-brand-primary rounded-xl text-xs font-bold hover:bg-white border border-transparent hover:border-gray-200 transition-all">
                Edit Details
              </button>
              <button className="px-4 py-2 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold hover:text-brand-primary transition-all">
                View Performance
              </button>
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
           <div className="md:col-span-2 glass-card p-20 text-center text-gray-400 border-dashed">
             <Plus className="w-12 h-12 mx-auto mb-4 opacity-10" />
             <p>You haven't posted any jobs yet.</p>
           </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">New Job Posting</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <XCircle className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
                <form onSubmit={handlePostJob} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <InputGroup label="Job Title" value={formData.title} onChange={v => setFormData({...formData, title: v})} placeholder="e.g. Senior Software Engineer" />
                     <InputGroup label="Location" value={formData.location} onChange={v => setFormData({...formData, location: v})} placeholder="e.g. Remote / New York" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <InputGroup label="Salary Range" value={formData.salary} onChange={v => setFormData({...formData, salary: v})} placeholder="e.g. $100k - $120k" />
                     <InputGroup label="Required Skills" value={formData.skills} onChange={v => setFormData({...formData, skills: v})} placeholder="e.g. React, Node, SQL" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Job Description</label>
                    <textarea 
                      required
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-brand-accent focus:outline-none transition-all resize-none text-sm"
                      placeholder="Describe the role, responsibilities, and requirements..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <button 
                    disabled={loading}
                    className="w-full py-4 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-gray-200 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Post Job Opportunity"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InputGroup({ label, value, onChange, placeholder, type = "text" }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">{label}</label>
      <input 
        required
        type={type}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-brand-accent focus:outline-none transition-all text-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
