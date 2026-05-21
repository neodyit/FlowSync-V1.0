# Faculty Task Management & Workflow System (FTMWS)

## Product Overview

Faculty Task Management & Workflow System (FTMWS) is a multi-college web-based task and workflow management platform designed for educational institutions.

The system enables Admins and HODs to:
- manage departments and faculties
- assign and monitor tasks
- track faculty performance
- review submissions
- maintain workflow records
- generate productivity insights
- control system-wide settings

The platform supports:
- role-based access control
- task lifecycle management
- audit logging
- reminders & notifications
- leaderboard & analytics
- multi-department faculty management

---

# Objectives

## Primary Goals

- Digitize faculty task workflows
- Improve task accountability
- Reduce manual follow-ups
- Provide deadline tracking
- Create centralized workflow visibility
- Maintain complete audit records
- Support multi-college deployment

---

# User Roles

## 1. Admin

### Permissions
- Manage colleges
- Create departments
- Create HOD accounts
- Create faculty accounts
- Assign faculties to departments
- Manage global system controls (Maintenance Mode, Pause Task Creation, Multipliers)
- View system feedbacks
- Bulk Export Data (Tasks, Users) to CSV
- View global leaderboards
- View all audit logs
- Manage permissions
- Monitor system activity

---

## 2. HOD

### Permissions
- Create tasks (Drafts or Published)
- Assign tasks individually
- Broadcast tasks to entire departments
- Advanced tracking of faculty participation
- Send push reminders
- Manage deadline extension requests
- Bulk review submissions
- Review individual submissions (approve/reject/rework)
- Add remarks
- Award points & bonus points
- View department analytics and leaderboards

---

## 3. Faculty

### Permissions
- Accept broadcast tasks
- Submit work with attachments
- Request deadline extensions
- Submit system feedback
- Add comments
- Track deadlines
- View leaderboard
- Receive notifications

---

# Multi-Tenant Architecture

The platform supports multiple colleges.

## Hierarchy

College
└── Departments
    └── Faculties

Each college operates independently with isolated data.

---

# Authentication & Authorization

## Authentication
- JWT-based authentication
- Centralized login system
- Session management
- Token expiration handling

## Authorization
- Backend-enforced RBAC
- Permission validation on every API request

---

# Department Management

## Features
- Create departments
- Assign HODs
- Manage faculty mapping
- Allow faculty in multiple departments

## Rules
- Faculty can belong to multiple departments
- Only Admin can approve cross-department access

---

# Task Management

## Task Types

- Academic
- Event
- Research
- Administrative
- Examination
- Documentation
- Other

---

## Task Priorities

- Low
- Medium
- High
- Critical

---

# Task Assignment Modes

## 1. Individual Assignment

HOD assigns task directly to one faculty.

### Visibility
Visible only to:
- assigned faculty
- HOD
- Admin

---

## 2. Broadcast Assignment

HOD broadcasts task to all department faculties.

### Workflow
- All eligible faculties in the department can view the broadcasted task.
- Multiple faculties can accept and work on the same broadcasted task simultaneously.
- No locking mechanism: Collaboration and parallel execution are encouraged.

---

## 3. Draft Mode

HOD can save tasks as drafts.

### Workflow
- Drafts are invisible to faculties.
- Useful when the task details are incomplete or if global task creation is paused by the Admin.
- Drafts can be published as Individual or Broadcast tasks later.

---

# Task Lifecycle

Draft
→ Assigned / Broadcasted
→ Accepted
→ In Progress
→ Submitted
→ Under Review
→ Approved
→ Rejected
→ Rework Required
→ Resubmitted
→ Completed
→ Expired

---

# Review Workflow

After a task is submitted by the faculty:
- **Approve**: HOD marks it as completed, awarding base and optional bonus points.
- **Rework Required**: HOD specifies missing elements. The task points are reset and the faculty must resubmit.
- **Reject**: The submission is entirely rejected.

---

# Task Visibility Rules

## Individual Tasks
Visible only to:
- assigned faculty
- HOD
- Admin

---

## Broadcast Tasks
Before acceptance:
- visible to all department faculties

After acceptance:
- Visible to the accepting faculty (as an active task)
- Continues to be visible to other faculties who can also accept it.
- visible to HOD
- visible to Admin

---

# Task Timestamps

Each task must maintain:

- assigned_at
- accepted_at
- submitted_at
- reviewed_at
- completed_at
- updated_at
- created_at

These timestamps will support:
- analytics
- audit trails
- performance reports
- leaderboard calculations

---

# Task Features

## Core Fields

- title
- description
- deadline
- priority
- task type
- remarks
- status
- department
- assigned faculty / broadcast flag
- reference links

---

## Attachments

### Supported Uploads
- PDFs
- Images
- Documents
- Excel files

### Attachment Areas
- task attachments
- submission attachments
- comment attachments

### Storage Rules
Files should not be stored directly in database.

Store:
- file path
- file size
- mime type
- uploader info

---

# Comment Thread System

Each task includes threaded comments.

## Features
- HOD comments
- Faculty replies
- Clarification discussion
- Timestamped communication

---

# Extensions & Reminders

## Deadline Extensions
- Faculties can formally request deadline extensions with reasons.
- HODs can approve or reject these requests with remarks.

## Push Reminders
- HODs can send manual push alerts to faculties who are delaying acceptance or submission.

---

# Notifications System

## Notification Types

- task assigned/broadcasted
- task accepted
- reminder alerts
- review updates
- deadline extension requests & decisions
- approval/rejection/rework alerts

## Delivery Channels

### In-App Notifications
Polling-based real-time updates

---

# Polling Strategy

## Recommended Intervals

Dashboard:
- every 5–10 seconds for real-time responsiveness

Notifications:
- every 5–10 seconds

---

# Leaderboard System

## Metrics
- tasks completed
- completion speed
- points earned
- bonus points
- consistency

---

## Advanced Analytics

- global multiplier overrides
- department-level breakdown charts
- task participation rates
- delay metrics

---

# Audit Logging

The system must maintain complete workflow records.

## Audit Events

- login/logout
- task creation
- assignment
- acceptance
- submission
- deadline updates
- approvals/rejections/reworks
- permission changes
- point updates
- global settings overrides

---

## Audit Log Data

- user
- action
- entity type
- entity id
- timestamp
- IP address
- user agent

---

# Database Recommendations

## Recommended Database
MySQL 8+

---

# Suggested Core Tables

- colleges
- departments
- users
- roles
- faculty_departments
- tasks
- task_assignments (tracks individual participation in tasks)
- task_comments
- task_reviews
- extension_requests
- notifications
- leaderboard_points
- attachments
- audit_logs
- system_settings
- feedbacks

---

# Suggested Tech Stack

## Frontend
- React
- TypeScript
- TailwindCSS
- Vite

---

## Backend
- PHP 8+
- REST APIs
- JWT Authentication

---

## Database
- MySQL 8+

---

# Security Requirements

- JWT validation on every request
- Role validation on backend
- Prepared statements only
- Input sanitization
- File upload validation
- Audit trail maintenance

---

# Non-Functional Requirements

## Performance
- Fast dashboard loading
- Optimized polling
- Indexed database queries

## Scalability
- Support multiple colleges
- Modular architecture

## Reliability
- Secure authentication
- Strict file validations

---

# Future Scope

- Real-time websocket notifications
- Mobile app (Native)
- AI-powered productivity insights
- Calendar integration
- Faculty achievement badges
