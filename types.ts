/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "STUDENT" | "EMPLOYER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  resumeUrl?: string;
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  description: string;
  skills: string;
  salary: string;
  location: string;
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  studentId: string;
  status: "PENDING" | "SHORTLISTED" | "REJECTED";
  applicantName: string;
  applicantResume: string;
  appliedAt: string;
  jobTitle?: string;
  employerName?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}
