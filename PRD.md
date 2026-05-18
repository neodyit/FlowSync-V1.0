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
- View all audit logs
- Manage permissions
- Monitor system activity

---

## 2. HOD

### Permissions
- Create tasks
- Assign tasks individually
- Broadcast tasks
- Review submissions
- Approve/reject submissions
- Extend deadlines
- Add remarks
- Award points & bonus points
- View department analytics

---

## 3. Faculty

### Permissions
- Accept tasks
- Decline tasks
- Submit work
- Upload attachments
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
- All eligible faculties can view task
- First faculty to accept gets assignment
- Temporary lock prevents race conditions

### Broadcast Lock System

When a faculty opens a broadcast task:
- task becomes temporarily locked
- other faculties can still view task
- others cannot accept during lock window

### Lock Expiry
If faculty does not accept within lock duration:
- task automatically unlocks
- others can accept

### Suggested Lock Duration
30–60 seconds

---

# Task Lifecycle

Draft
→ Assigned / Broadcasted
→ Locked
→ Accepted
→ In Progress
→ Submitted
→ Under Review
→ Approved
→ Rejected
→ Rework Required
→ Resubmitted
→ Completed
→ Declined
→ Expired

---

# Rework Workflow

If submission is rejected:
- HOD provides remarks
- Task enters "Rework Required"
- Faculty resubmits task
- HOD reviews again

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
- visible to department faculties

After acceptance:
- hidden from other faculties
- visible only to:
  - assigned faculty
  - HOD
  - Admin

---

# Task Timestamps

Each task must maintain:

- assigned_at
- accepted_at
- submitted_at
- reviewed_at
- completed_at
- declined_at
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
- assigned faculty

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

# Review System

After submission:
- HOD reviews work
- adds remarks
- approves/rejects
- awards points
- awards bonus points

---

# Decline Workflow

Faculty may decline task with remarks.

## Decline Process

Assigned
→ Declined
→ HOD notified
→ HOD reassigns or cancels

---

# Notifications System

## Notification Types

- task assigned
- task accepted
- task declined
- reminder alerts
- review updates
- deadline extension
- approval/rejection alerts

---

## Delivery Channels

### In-App Notifications
Polling-based updates

### Email Notifications
Automated email reminders

---

## Reminder System

### Examples
- 2 days before deadline
- 1 day before deadline
- overdue notification

---

# Polling Strategy

## Recommended Intervals

Dashboard:
- every 20–30 seconds

Notifications:
- every 10–15 seconds

---

# Leaderboard System

## Metrics
- tasks completed
- completion speed
- points earned
- bonus points
- consistency

---

## Future Analytics

- best performer
- most active faculty
- highest score
- monthly performance
- department efficiency

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
- approvals/rejections
- permission changes
- point updates

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
- task_locks
- task_comments
- task_reviews
- notifications
- leaderboard_points
- attachments
- audit_logs

---

# Suggested Tech Stack

## Frontend
- React
- TypeScript
- TailwindCSS

---

## Backend
- PHP 8+
- REST APIs
- JWT Authentication

---

## Database
- MySQL 8+

---

# API Design Recommendations

Use REST-style APIs.

## Examples

/api/tasks/create
/api/tasks/accept
/api/tasks/review
/api/tasks/comment
/api/notifications/list

Avoid query-action style APIs.

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
- Transaction-safe task acceptance
- Lock expiry handling
- Secure authentication

---

# Future Scope

- Group/collaborative tasks
- Task templates
- Real-time websocket notifications
- Mobile app
- Analytics dashboard
- AI-powered productivity insights
- Calendar integration
- Faculty achievement badges

---

# Project Status

Current Version Scope:
- Individual tasks
- Broadcast tasks
- Review workflow
- Notifications
- Audit logging
- Leaderboard
- Multi-college support

Excluded From Current Scope:
- Collaborative/group tasks
- Task templates
- Escalation system
- Real-time socket architecture
