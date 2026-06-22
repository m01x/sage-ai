---
description: Explains the current project — detected stack, architecture, purpose, inputs/outputs, and main modules. Updates the project's truth-source index.
agent: sage
subtask: true
---

**IMPORTANT: You must respond entirely in the language specified by the `language` field in `sage.md`. If `language: es`, write everything in Spanish — section headers, content, observations, and closing. Do not use English regardless of the language this prompt is written in. Use Markdown headers (# , ## ) for each section title. This is mandatory for terminal rendering.**

Analyze the current project and produce a structured explanation following the exact format below.

## Pre-flight confirmation

Before doing anything else, ask the user for explicit confirmation. `/exp` is the most expensive Sage command — it walks the project tree, reads declarative configs, and may produce a long report. The user must opt in.

**Dual-path:** try the `question` tool first; if unavailable, fall back to text.

### Step 1 — Warning text in chat

Present the warning in the configured language. Example for `language: es`:

> ⚠ Este comando escaneará tu proyecto: archivos fuente, configuraciones declarativas y documentación detectada. Dependiendo del tamaño, puede demorar y consumir una cantidad considerable de tokens.
>
> Te sugiero usar un modelo capaz (Gemini Pro, DeepSeek, Qwen u Otro) para obtener resultados precisos.
>
> <if sources.json exists>Ya existe un `sources.json` de un escaneo anterior. Si aceptas, lo reemplazaré con un índice fresco.</if>

Equivalent for `language: en` — adjust accordingly.

### Step 2 — Ask via dual-path

**Path A (question tool):**
```json
{
  "questions": [{
    "header": "Confirmar /exp",
    "question": "¿Procedo con el escaneo?",
    "options": [
      {"label": "Acepto", "description": "Iniciar el escaneo del proyecto"},
      {"label": "Rechazo", "description": "Cancelar y no leer nada"}
    ]
  }]
}
```

**Path B (fallback en chat):**
```
¿Procedo con el escaneo?
1. Acepto
2. Rechazo
```

### Step 3 — Process answer

- Accepted → proceed to "Before responding".
- Rejected or hesitant → stop immediately. Acknowledge in the configured language (e.g. _"Entendido, no escaneo nada. Cuando quieras volver, ejecuta `/exp`."_) and do nothing else.

Do not perform any read, glob, grep, or subagent call before receiving confirmation.

## Before responding

1. Check if `.opencode/sage/sources.json` exists in the project root. If it does, read it first — it tells you where the project keeps its sources of truth (ADRs, specs, README, contracts).
2. Use **@explore** to walk the directory structure and read declarative configuration files (`package.json`, `tsconfig.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`, `docker-compose.yml`, etc.).
3. Identify documentation sources: folders named `ADR/`, `docs/`, `specifications.md`, `README.md`, DTO/contract files. Note their paths.
4. Detect any skills available under the locations defined in `sage.md`.
5. Do not invent or assume — every claim must be backed by what you actually read.

## Output format

Output must fit comfortably in a terminal. Use the exact structure below. Omit a category if you have no evidence for it.

```
# Tech Stack
Languages:        <list>
Frontend:         <frameworks, key libraries, UI layer>
Backend:          <framework, ORM, key libraries>
Database:         <engine + version if visible>
Infrastructure:   <package manager, containers, build tools>
External services: <APIs, brokers, caches — only if detected>
Not detected:     <categories you looked for but didn't find>

# Architecture
<one line listing the patterns detected, separated by · — e.g. "Monorepo · Client-Server · REST API · MVC">

# Purpose
<one sentence: what this system does. If the project has a roadmap or phase markers in ADRs, include the current phase.>

# Inputs / Outputs
| Input                          | Output                          |
| <max 4 rows, most important>   | <max 4 rows, most important>    |

# Main modules
<module name>      → <one-line responsibility>
<module name>      → <one-line responsibility>
(max 6 modules — group secondary ones if needed)

# Observations
- <observation>
- <observation>
(max 4 items — only what is genuinely useful to the developer)
```

Include an observation only if it falls into one of these categories:

- **Stale documentation** — a doc or ADR describes something that no longer matches the code
- **Active stubs** — methods or endpoints that throw NotImplementedException or equivalent
- **Presentational-only components** — UI with no state, validation, or API integration
- **Risky config** — settings like `synchronize: true`, hardcoded secrets, missing `.env.example`
- **Structural inconsistencies** — empty folders that should have content, misplaced files

If nothing qualifies, omit the section entirely. Do not force observations.

## After producing the report
**NEVER print the contents of sources.json.** The user must not see the JSON in their terminal.
Write or update `.opencode/sage/sources.json` silently. Confirm with a single line only:
- Spanish: `sources.json actualizado.`
- English: `sources.json updated.`

Nothing else. No JSON, no file path, no "# Wrote" annotation.

Use this schema for this file:

```json
{
  "version": "1.0",
  "indexed_at": "<current ISO-8601 timestamp>",
  "sources": [
    {
      "path": "<relative path>",
      "type": "<decision_records|specs|readme|contracts|other>",
      "priority": "<high|medium|low>"
    }
  ],
  "skills_detected": [
    {
      "path": "<relative or absolute path to SKILL.md>",
      "scope": "<project|global>"
    }
  ]
}
```

If the file did not exist, create it. If it existed, replace it with the fresh scan — `/exp` is the canonical refresh moment.

## Closing

End with a single line offering the natural next step. Examples:

- If you detected stub/placeholder code: _"I noticed `<module>` has placeholder logic. Want me to inspect it with `/exp-file @<path>`?"_
- If the project has many modules: _"Want me to go deeper into a specific module with `/exp-file @<path>` or visualize data flow with `/flow @<path>`?"_
- If you detected inconsistencies between sources: _"I found inconsistencies between `<source A>` and `<source B>` — want me to walk through them?"_

Make the closing specific to what you actually found, not generic.
