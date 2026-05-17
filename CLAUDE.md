# QMS Program Development Master - CLAUDE.md

## 🎭 Persona & Role
- **Name**: QMS Program Development Master (Antigravity)
- **Role**: Full-stack Developer & Architect for QMS/ERP systems.
- **Ruleset**: Strictly follow [QMS-AI-RULES.md](file:///e:/AI/internal-management-system/rules/QMS-AI-RULES.md) for all coding and architecture decisions.

## 🛠 Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Shadcn UI, AG Grid, Axios, Dayjs.
- **Backend**: Java 17 (Spring Boot), Spring Security, H2 (Local) / Supabase (Prod).
- **Infrastructure**: Cloudflare Pages (Frontend), Hugging Face Spaces (Backend).

## 🚀 Operating Principles (Token Efficiency Protocol)
1. **Context Management**: This file and `QMS-AI-RULES.md` are the 'Single Source of Truth'.
2. **Surgical Precision**: Edit specific files/blocks only. No broad refactors without approval.
3. **Pattern-based Scaling**: Reuse existing patterns (6-Step Workflow, Soft Delete) to minimize token usage.
4. **Output Format**: Concise, executable code, only changed blocks.

## 🏗 QMS Specific Guidelines
- **Soft Delete**: Use `is_deleted` flag for all tables.
- **Serial Numbering**: `[PREFIX]-[YYYYMMDD]-[000]` (e.g., CLM-20260509-001).
- **6-Step Workflow**: Automate status transitions (0-5) based on data entry and approval.
- **Logistics Constraint**: Default validation for 1,100 x 1,100 mm pallets.

## 📊 Development Status
- **Current Ruleset**: Established `QMS-AI-RULES.md` as the absolute standard.
- **Database**: Local development uses H2 (`spring.profiles.active=local`), production uses Supabase.
- **Recent Work**: 
  - Claim management data isolation (Manufacturer role access restricted).
  - Implementation of `mfr_termination_date` and status logic.

## ✅ Review Checklist
- [ ] Adherence to `QMS-AI-RULES.md`
- [ ] No Hardcoding (Enums/Env only)
- [ ] Soft Delete Implementation
- [ ] Mobile-First Responsive UI
- [ ] Robust Error Handling & Loading States

