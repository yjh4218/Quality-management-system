# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# QMS Program Development Master Info

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
- **Flyway Migration**: Every entity schema/field modification MUST include a corresponding V__<name>.sql script inside db/migration to avoid production database schema mismatch.

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
