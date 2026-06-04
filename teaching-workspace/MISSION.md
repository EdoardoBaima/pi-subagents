# Mission: Pi and pi-subagents internals

## Why
Understand Pi and `pi-subagents` by heart so you can reason confidently about crafting, iterating, debugging, and maintaining subagents as a Pi package. The learning should make context management, chaining, context passing, message passing, and parent/child agent relationships feel inspectable rather than magical.

## Success looks like
- Explain how Pi loads packages, extensions, skills, prompts, and tools from `pi-subagents`.
- Trace a subagent run from parent prompt → `subagent` tool call → child Pi session → result returned to parent.
- Design or modify agents, chains, context modes, async/background runs, and message-passing behavior intentionally.
- Debug context-management failures by inspecting sessions, prompts, tool inputs/results, and relevant extension lifecycle events.
- Create teaching artifacts and exercises that map concepts to real `pi-subagents` source files.

## Constraints
- Prefer grounded teaching from local Pi docs and `pi-subagents` source over parametric memory.
- Keep each session tightly scoped to one internal mechanism or workflow.
- Use hands-on source tracing and small exercises, not abstract architecture lectures.

## Out of scope
- General multi-agent theory unless it directly explains `pi-subagents` behavior.
- Full Pi internals unrelated to packages, extensions, sessions, context, tools, message flow, or TUI/resource loading.
