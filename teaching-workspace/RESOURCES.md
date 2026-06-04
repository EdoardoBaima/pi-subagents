# Pi and pi-subagents Resources

## Knowledge

- [Local doc: Pi Packages](C:/Users/Edoardo/AppData/Roaming/fnm/node-versions/v24.12.0/installation/node_modules/@earendil-works/pi-coding-agent/docs/packages.md)
  Use for: how `pi-subagents` is discovered and installed as a Pi package, including `package.json` `pi` manifest, conventional directories, dependencies, package scope, and filtering.
- [Local doc: Pi Extensions](C:/Users/Edoardo/AppData/Roaming/fnm/node-versions/v24.12.0/installation/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md)
  Use for: extension lifecycle events, tool registration, commands, `ctx`, session hooks, custom rendering, message injection, and extension state.
- [Local doc: Pi Sessions](C:/Users/Edoardo/AppData/Roaming/fnm/node-versions/v24.12.0/installation/node_modules/@earendil-works/pi-coding-agent/docs/sessions.md)
  Use for: session storage, `/tree`, `/fork`, `/clone`, branch navigation, and how session trees affect context.
- [Local doc: Pi Session File Format](C:/Users/Edoardo/AppData/Roaming/fnm/node-versions/v24.12.0/installation/node_modules/@earendil-works/pi-coding-agent/docs/session-format.md)
  Use for: message types, session entries, custom entries/messages, `buildSessionContext()`, and the `SessionManager` API.
- [Local doc: Pi Compaction & Branch Summarization](C:/Users/Edoardo/AppData/Roaming/fnm/node-versions/v24.12.0/installation/node_modules/@earendil-works/pi-coding-agent/docs/compaction.md)
  Use for: context-window management, summaries, branch summaries, split turns, and custom summarization hooks.
- [Repo: `pi-subagents` README](../README.md)
  Use for: user-facing mental model, builtin agents, common workflows, configuration surface, async/background behavior, chains, and parallel runs.
- [Repo: `pi-subagents` package manifest](../package.json)
  Use for: the concrete package declaration: extension entrypoint, skills, prompts, dependencies, peer dependencies, and npm package metadata.
- [Repo: builtin agent prompts](../agents/)
  Use for: how roles like `scout`, `planner`, `worker`, `reviewer`, `oracle`, and `delegate` are expressed as agent definitions.
- [Repo: source extension entrypoint](../src/extension/index.ts)
  Use for: source tracing from Pi extension load into the registered subagent tool and runtime behavior.
- [Repo: tests](../test/)
  Use for: executable examples of expected behavior and regression-safe exercises.

## Wisdom (Communities)

- Project maintainers / issue tracker for `pi-subagents`
  Use for: validating assumptions about intended design, undocumented edge cases, and future direction.
- Pi package/extension users in Edoardo's local workflow
  Use for: real feedback on whether subagent workflows, chains, and context-passing designs are actually useful.

## Gaps

- Need to identify the most relevant `pi-subagents` source files for: tool schema, single/chain/parallel execution, async runs, fork/fresh context, output files, intercom/control, and clarification UI.
- Need a first hands-on exercise that traces one simple `subagent` call end-to-end.
