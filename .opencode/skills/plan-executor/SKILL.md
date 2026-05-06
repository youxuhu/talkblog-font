---
name: plan-executor
description: Read a task list document and execute tasks step by step, stop and reporting progress after each task.
---

## What I do
1. Read the task document from the specified path
2. Parse the task list (supports Markdown lists and numbered items)
3. Execute the **current** task only
4. After completing the task, mark it as completed, report progress, and **STOP**
5. Wait for user's command to proceed to the next task

## Input format
- Task document path (required, e.g., `docs/tasks.md`)
- Task format supports: `- [ ] Task description` or `1. Task description`

## Execution rules
- Read the full document first to understand all tasks
- **Only execute the first incomplete task** (or the task specified by user)
- After completion, output:
✅ Task [N] completed: [task description]
📋 Progress: [completed]/[total] tasks done
⏸️ Ready for next task. Type "next" or "continue" to proceed.

text
- **DO NOT** automatically proceed to the next task
- If a task fails, stop and ask for guidance
- If a task is ambiguous, ask for clarification before proceeding
- Update the task document by marking completed tasks as `- [x]` or adding `[DONE]` suffix

## User commands for progression
- `next` or `continue` - Execute the next incomplete task
- `task [number]` - Execute a specific task by number
- `status` - Show current progress without executing
- `reset` - Reset all task statuses
- `skip` - Mark current task as skipped and move to next

## Workflow example

**User:** "用 plan-executor 执行 docs/tasks.md 里的任务"

**AI:** 
📖 Reading tasks from docs/tasks.md...