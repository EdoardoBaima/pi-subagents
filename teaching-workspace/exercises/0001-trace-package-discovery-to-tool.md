# Exercise 0001: Trace package discovery to `subagent` tool

Goal: prove you can trace how Pi turns the `pi-subagents` package into an available custom tool.

## Files to inspect

1. `package.json`
2. `src/extension/index.ts`
3. `src/extension/schemas.ts`

## Tasks

Answer these in your own words:

1. Which exact manifest field tells Pi to load `src/extension/index.ts`?
2. What is the default exported function in `src/extension/index.ts` called?
3. What environment condition prevents ordinary child subagents from registering the full `subagent` tool again?
4. Which object property gives the tool its callable name?
5. Which exact call registers the tool with Pi?
6. What does `SubagentParams` control?
7. If you added a new top-level tool argument, which file would you start from?

## Stretch

Explain this chain in one sentence:

`pi install npm:pi-subagents` → `package.json` → `src/extension/index.ts` → `pi.registerTool(tool)` → model can call `subagent`
