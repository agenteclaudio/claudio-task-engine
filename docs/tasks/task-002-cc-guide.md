# Guía de Claude Code: Prompting, Hooks y Best Practices

*Task-002 — Compilado desde repos de @pablowasinger, IndyDevDan, documentación oficial de Anthropic, y 70+ fuentes de la comunidad.*

---

## Tabla de Contenidos

1. [Conceptos Fundamentales](#1-conceptos-fundamentales)
2. [Patrones de Prompting Efectivos](#2-patrones-de-prompting-efectivos)
3. [Cómo Usar Claude Code](#3-cómo-usar-claude-code)
4. [Hooks: Automatización y Control](#4-hooks-automatización-y-control)
5. [Tasks: Coordinación Multi-Sesión](#5-tasks-coordinación-multi-sesión)
6. [Agent Teams y Swarm Orchestration](#6-agent-teams-y-swarm-orchestration)
7. [Integración con OpenClaw](#7-integración-con-openclaw)
8. [Ejemplos Concretos Paso a Paso](#8-ejemplos-concretos-paso-a-paso)
9. [Casos de Uso](#9-casos-de-uso)
10. [Recursos y Referencias](#10-recursos-y-referencias)

---

## 1. Conceptos Fundamentales

### ¿Qué es Claude Code?

Claude Code (CC) es el CLI oficial de Anthropic para programar con Claude. A diferencia de interfaces web, CC opera directamente en tu terminal con acceso a tu filesystem, git, y herramientas de desarrollo.

**Diferencias clave vs. chat web:**
- Acceso directo al código fuente y terminal
- Subagentes para tareas paralelas
- Sistema de Tasks con dependencias
- Hooks para automatización pre/post ejecución
- Compactación automática de contexto
- Agent Teams para coordinación multi-instancia

### El Modelo Mental Correcto

> *"OpenClaw is trying to act as a coding agent instead of using Claude Code."* — Nathan Flurry

CC no es un chatbot que escribe código. Es un **agente de desarrollo** que:
1. Lee tu codebase completo
2. Planifica cambios multi-archivo
3. Ejecuta comandos
4. Itera sobre errores
5. Gestiona su propio contexto

### Archivos de Configuración

| Archivo | Alcance | Propósito |
|---------|---------|-----------|
| `~/.claude/settings.json` | Global | Configuración personal |
| `.claude/settings.json` | Proyecto | Config del proyecto (committeable) |
| `CLAUDE.md` | Proyecto | Instrucciones para Claude (como AGENTS.md) |
| `~/.claude/tasks/` | Global | Tasks persistentes entre sesiones |

**CLAUDE.md** es el equivalente de AGENTS.md para CC. Define convenciones, stack tecnológico, patrones preferidos. Es lo primero que CC lee al iniciar una sesión.

---

## 2. Patrones de Prompting Efectivos

### 2.1 Spec-Based Development (El Patrón Estrella)

> *"My favorite way to use Claude Code to build large features is spec based — start with a minimal spec, ask Claude to interview you, then make a new session to execute the spec."* — Thariq (Anthropic)

**Flujo:**
1. Escribí un spec mínimo (qué querés, no cómo)
2. Pedile a CC que te entreviste para completar gaps
3. CC genera spec detallado
4. Nueva sesión → CC ejecuta el spec con Tasks

```
Quiero implementar autenticación JWT en mi API Express.
Antes de empezar, entrevistame para entender mis requerimientos exactos.
```

### 2.2 El Patrón "Plan Then Execute"

Separar planificación de ejecución:

```
# Sesión 1: Planificación
Analizá el codebase y creá un plan detallado para migrar de REST a GraphQL.
No hagas cambios todavía. Solo el plan con Tasks y dependencias.

# Sesión 2: Ejecución
Ejecutá el plan de migración. Seguí las Tasks en orden de dependencias.
```

### 2.3 Prompt Incremental (No Todo de Una)

❌ **Malo:**
```
Creá una app completa de e-commerce con auth, productos, carrito, checkout, 
pagos con Stripe, notificaciones por email, dashboard admin, y deploy a AWS.
```

✅ **Bueno:**
```
Sesión 1: "Inicializá proyecto Next.js con TypeScript, Tailwind, y estructura base"
Sesión 2: "Implementá modelo de datos para productos y auth con Supabase"
Sesión 3: "Agregá carrito de compras con estado client-side"
...
```

### 2.4 El Patrón "Constraint First"

Definí restricciones antes del pedido:

```
Restricciones:
- No uses librerías externas nuevas (solo las del package.json)
- Tests con vitest, no jest
- Seguí el patrón de error handling existente en src/lib/errors.ts
- Máximo 200 líneas por archivo

Tarea: Implementá el endpoint de búsqueda de productos con filtros.
```

### 2.5 Contexto Explícito

CC tiene acceso al filesystem pero no sabe qué es importante. Señalalo:

```
Mirá src/middleware/auth.ts — ahí está el patrón actual de autenticación.
Necesito que el nuevo endpoint siga el mismo patrón.
Los tipos están en src/types/api.ts.
```

### 2.6 El Patrón "Review and Fix"

En vez de pedir que escriba perfecto de una:

```
1. Implementá la feature
2. Corré los tests
3. Si fallan, fixeá
4. Corré el linter
5. Fixeá warnings
6. Hacé un review final del diff
```

### 2.7 Prompts de Una Línea Efectivos

Para tareas simples, ser directo:

```
Fixeá el error de TypeScript en src/api/users.ts línea 45
```

```
Agregá un test para el caso edge de usuario sin email en auth.test.ts
```

```
Refactorizá extractUserData para usar optional chaining
```

---

## 3. Cómo Usar Claude Code

### 3.1 Instalación y Setup

```bash
# Instalar
npm install -g @anthropic-ai/claude-code

# Iniciar sesión interactiva
claude

# Con modelo específico
claude --model claude-sonnet-4-20250514

# Ejecutar comando one-shot
claude -p "explicá qué hace este repo"

# Continuar última sesión
claude --continue

# Resumir sesión específica
claude --resume
```

### 3.2 Modo Interactivo vs One-Shot

**Interactivo** (`claude`): Para desarrollo iterativo, exploración, debugging.

**One-shot** (`claude -p "..."`): Para tareas atómicas, CI/CD, scripts.

```bash
# One-shot: generar commit message
claude -p "mirá el diff staged y generá un commit message convencional"

# One-shot: code review
claude -p "revisá los cambios en el último commit y reportá issues"

# One-shot: documentación
claude -p "generá JSDoc para todas las funciones exportadas en src/lib/"
```

### 3.3 Gestión de Contexto

CC tiene ventana de contexto limitada. Cuando se llena, **compacta** automáticamente (resume lo anterior).

**Tips:**
- Sesiones cortas y enfocadas > una sesión maratón
- Cada step es su propia sesión: cleanup, review tests, audit, fix issues antes de avanzar
- `--continue` para retomar, no para sesiones de 8 horas

### 3.4 Subagentes

CC puede spawnear subagentes para trabajo paralelo:

```
Necesito que hagas estas 3 cosas en paralelo:
1. Refactorizá el módulo de auth
2. Actualizá los tests de integración
3. Revisá y actualizá la documentación

Usá subagentes para las tareas independientes.
```

### 3.5 Comandos Útiles en Sesión

| Comando | Acción |
|---------|--------|
| `/help` | Ayuda |
| `/compact` | Forzar compactación de contexto |
| `/clear` | Limpiar contexto |
| `/cost` | Ver tokens/costo de la sesión |
| `/model` | Cambiar modelo mid-session |
| `/permissions` | Ver/editar permisos |

### 3.6 MCP Servers

CC soporta Model Context Protocol para integrar herramientas externas:

```bash
# Agregar MCP server
claude mcp add taskmaster-ai -- npx -y task-master-ai
claude mcp add github -- gh copilot mcp
```

---

## 4. Hooks: Automatización y Control

### 4.1 ¿Qué Son los Hooks?

Hooks son scripts que se ejecutan automáticamente antes o después de acciones de CC. Definidos en `~/.claude/settings.json` o `.claude/settings.json`.

**Tipos de hooks:**
- `PreToolUse` — Antes de usar una herramienta (file write, bash, etc.)
- `PostToolUse` — Después de usar una herramienta
- `Notification` — Cuando CC quiere notificarte
- `Stop` — Cuando CC termina su turno

### 4.2 Estructura de un Hook

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'About to run bash command'"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/my-lint-script.sh $CLAUDE_FILE_PATH"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code terminó'"
          }
        ]
      }
    ]
  }
}
```

### 4.3 Hooks Útiles (IndyDevDan Patterns)

**Auto-lint después de escribir archivos:**
```json
{
  "PostToolUse": [{
    "matcher": "Write",
    "hooks": [{
      "type": "command",
      "command": "npx eslint --fix $CLAUDE_FILE_PATH 2>/dev/null; exit 0"
    }]
  }]
}
```

**Prevenir escritura en archivos protegidos:**
```json
{
  "PreToolUse": [{
    "matcher": "Write",
    "hooks": [{
      "type": "command",
      "command": "if echo $CLAUDE_FILE_PATH | grep -q 'package-lock.json\\|.env'; then echo 'BLOCKED: Protected file'; exit 1; fi"
    }]
  }]
}
```

**Notificación al completar (para OpenClaw):**
```json
{
  "Stop": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "openclaw system event --text 'Claude Code terminó: revisa los cambios' --mode now"
    }]
  }]
}
```

**Auto-commit después de cambios:**
```json
{
  "Stop": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "cd $CLAUDE_PROJECT_DIR && git add -A && git commit -m 'wip: auto-commit from Claude Code' 2>/dev/null; exit 0"
    }]
  }]
}
```

### 4.4 El Patrón "Ralph Wiggum" (Loops Autónomos)

Antes de Tasks nativo, la comunidad usaba Stop hooks para crear loops:

```json
{
  "Stop": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "if [ -f .claude/plan.md ]; then claude -p 'Continuá con el siguiente paso del plan en .claude/plan.md'; fi"
    }]
  }]
}
```

Esto hacía que CC se re-invocara al terminar, continuando un plan multi-paso. Hoy **Tasks nativo** reemplaza este patrón.

---

## 5. Tasks: Coordinación Multi-Sesión

### 5.1 Qué Son Tasks

Reemplazaron a Todos en CC v2.1.16. No son simples checkboxes — son unidades de trabajo con:
- **Dependencias** (`blockedBy` / `blocks`)
- **Persistencia** en disco (`~/.claude/tasks/`)
- **Coordinación** entre sesiones vía `CLAUDE_CODE_TASK_LIST_ID`
- **Auto-desbloqueo** cuando dependencias se completan

### 5.2 Las 4 Herramientas de Tasks

```
TaskCreate  → Crea nueva task con subject, description
TaskGet     → Lee detalles de una task
TaskUpdate  → Cambia status, owner, dependencias
TaskList    → Lista todas las tasks con estado
```

### 5.3 Patrones de Ejecución

**Secuencial:**
```
#1 Setup DB → #2 Auth (blocked by #1) → #3 API (blocked by #2) → #4 Tests (blocked by #3)
```

**Paralelo con convergencia (diamante):**
```
#1 Frontend Auth ──┐
                   ├── #3 Integration Tests (blocked by #1, #2)
#2 Backend Auth ───┘
```

**Ejecución por oleadas:**
```
Wave 1 (sin deps):    #1, #7, #8 → paralelo
Wave 2 (después W1):  #2 (blocked by #1), #3 (blocked by #1)
Wave 3 (después W2):  #4 (blocked by #2, #3)
```

### 5.4 Multi-Sesión con Task List Compartida

```bash
# Terminal 1: Frontend
CLAUDE_CODE_TASK_LIST_ID=proyecto-auth claude

# Terminal 2: Backend
CLAUDE_CODE_TASK_LIST_ID=proyecto-auth claude

# Ambas sesiones ven las mismas tasks en tiempo real
```

### 5.5 Benchmark Real

> *"Running tasks in the main session consumed 56% of context window. Same work distributed across sub-agents used only 18% of orchestrator's context."* — dplooy.com

---

## 6. Agent Teams y Swarm Orchestration

### 6.1 Qué Son Agent Teams

Nivel superior a subagentes. Son instancias independientes de CC con:
- **Shared task list** como mecanismo de coordinación
- **Messaging directo** entre agentes
- **Lifecycle management** (shutdown requests/approvals)

### 6.2 Herramientas de Teams

```
TeamCreate       → Crear equipo con descripción
TeamAddMember    → Agregar miembro con rol
TeamSendMessage  → Mensajear a otro agente
TeamListMembers  → Ver el equipo
TeamRemove       → Remover miembro
```

### 6.3 Ejemplo: Squad de 10 Agentes

> *"Mission Control: A Squad of 10 autonomous agents. Led by Jarvis. They create work on their own. They claim tasks. They talk with each other. They refute each other. They review each other's work."* — @pbteja1998

**Patrón:**
1. Orchestrator crea team y define tasks con dependencias
2. Workers claim tasks disponibles (sin blockers)
3. Al completar, auto-desbloquean la siguiente oleada
4. Workers se comunican vía messaging para resolver conflictos
5. Orchestrator monitorea progreso y re-planifica si es necesario

### 6.4 Storage

```
~/.claude/teams/{team-name}/
├── config.json              # Metadata, member list
└── inboxes/
    ├── team-lead.json       # Inbox del líder
    └── worker-N.json        # Inbox de cada worker

~/.claude/tasks/{team-name}/
├── 1.json ... N.json        # Tasks compartidas
```

---

## 7. Integración con OpenClaw

### 7.1 El Insight Clave (Nathan Flurry)

> *"openclaw is the perfect agent orchestrator, but you're holding it wrong"*

OpenClaw orquesta. CC ejecuta código. No compiten — se complementan.

### 7.2 Métodos de Integración

**A) Skill `coding-agent` (built-in)**

Ya viene con OpenClaw. Corre CC como proceso PTY en background:
```
# En AGENTS.md:
Background Coding Work:
When I ask you to do coding tasks in the background:
1. Use the coding-agent skill
2. Prefer Claude Code
3. Do NOT use sessions_spawn for coding work
```

**B) CLI Backends (configuración nativa)**
```json
{
  "agents": {
    "defaults": {
      "cliBackends": {
        "claude-cli": {
          "command": "/path/to/claude"
        }
      }
    }
  }
}
```

**C) Plugin @betrue (sesiones ricas desde chat)**
- Múltiples sesiones CC concurrentes desde WhatsApp/Discord
- Follow-ups multi-turn, foreground/background
- Notificaciones de completado, presupuesto, preguntas
- https://github.com/alizarion/openclaw-claude-code-plugin

**D) MCP Integration (Enderfga)**
- Acceso directo via MCP protocol a todas las herramientas de CC
- Sesiones persistentes, control de tools, budget limits
- https://github.com/Enderfga/openclaw-claude-code-skill

### 7.3 Workflow Recomendado

1. **OpenClaw recibe pedido** (WhatsApp, Discord, etc.)
2. **Planifica** usando modelo económico (Haiku/Sonnet)
3. **Spawns CC** via coding-agent skill con instrucciones precisas
4. **CC ejecuta** en background con Tasks y subagentes
5. **Stop hook** notifica a OpenClaw al terminar
6. **OpenClaw reporta** resultado al usuario

---

## 8. Ejemplos Concretos Paso a Paso

### Ejemplo 1: Feature Nueva con Spec-Based Development

```bash
# Paso 1: Crear spec
claude -p "Leé el codebase y creá un spec para agregar sistema de notificaciones 
push. Guardalo en docs/specs/push-notifications.md"

# Paso 2: Revisar y iterar
claude --continue
> "El spec se ve bien, pero quiero usar Firebase Cloud Messaging, no OneSignal"

# Paso 3: Ejecutar con Tasks
claude
> "Implementá el spec en docs/specs/push-notifications.md. 
   Creá Tasks con dependencias y ejecutá en orden."
```

### Ejemplo 2: Bug Fix con Contexto

```bash
claude
> "Hay un bug: cuando un usuario sin avatar sube un comentario, 
   la app crashea con 'Cannot read property url of null'.
   El error está en src/components/CommentCard.tsx.
   Fixealo y agregá un test que cubra este caso edge."
```

### Ejemplo 3: Code Review Automatizado

```bash
# En CI/CD pipeline
claude -p "Revisá los cambios en el PR actual (git diff main..HEAD).
Reportá: bugs potenciales, problemas de seguridad, mejoras de performance,
code style issues. Formato: lista con severidad (critical/warning/info)."
```

### Ejemplo 4: Refactor Multi-Archivo con Parallelismo

```bash
CLAUDE_CODE_TASK_LIST_ID=refactor-v2 claude
> "Necesito migrar todos los componentes de class-based a functional con hooks.
   Hay 47 componentes en src/components/.
   Creá tasks agrupadas por módulo, con tests como dependencias.
   Ejecutá en paralelo lo que se pueda."
```

### Ejemplo 5: Desde OpenClaw

```
[WhatsApp] Vos: "Claudio, necesito que implementes dark mode en el proyecto web"

[OpenClaw internamente]:
1. Lee el proyecto, identifica stack (Next.js + Tailwind)
2. Spawns coding-agent con Claude Code
3. CC crea Tasks: 
   - #1 Setup CSS variables para themes
   - #2 Componente ThemeToggle (blocked by #1)
   - #3 Migrar componentes a variables (blocked by #1)
   - #4 Tests E2E (blocked by #2, #3)
4. CC ejecuta en orden de dependencias
5. Stop hook → openclaw system event "Dark mode implementado"

[WhatsApp] Claudio: "Listo, implementé dark mode. 4 tasks completadas, 
todos los tests pasan. Revisá el PR en GitHub."
```

---

## 9. Casos de Uso

### 9.1 Desarrollo (Core)

- **Feature development** con spec-based workflow
- **Bug fixing** con contexto de codebase
- **Refactoring** multi-archivo con Tasks paralelas
- **Code review** automatizado en CI/CD
- **Documentación** (JSDoc, README, API docs)
- **Testing** (generar tests, aumentar coverage)
- **Migraciones** (versiones, frameworks, lenguajes)

### 9.2 Research

- Analizar repos open-source y generar reportes
- Comparar librerías/frameworks con pros/cons
- Extraer patrones de codebases grandes
- Generar summaries de papers/docs técnicos

### 9.3 Automation

- **CI/CD hooks**: Code review automático en PRs
- **Git automation**: Commit messages, changelogs, release notes
- **Project setup**: Scaffolding con best practices
- **Dependency updates**: Analizar breaking changes, actualizar
- **Security audits**: Escanear vulnerabilidades en código

### 9.4 Con OpenClaw (Orquestación)

- Recibir pedidos de código por WhatsApp/Discord
- Coding asíncrono mientras hacés otra cosa
- Monitoreo de proyectos (heartbeat + git status)
- Multi-proyecto: un OpenClaw orquestando CC en varios repos
- Deploy automático con notificación al completar

---

## 10. Recursos y Referencias

### Repos Clave

| Repo | Qué Tiene |
|------|-----------|
| **@pablowasinger** curso CC | Basado en IndyDevDan, patrones de prompting, hooks prácticos |
| **IndyDevDan** claude-hooks-mastery | Hooks avanzados, automatización, patterns de control |
| **kieranklaassen** Swarm Orchestration | Skill completa para Agent Teams + Tasks |
| **eyaltoledano/claude-task-master** | MCP server PRD→Tasks con dependencias |
| **alizarion/openclaw-claude-code-plugin** | Plugin OpenClaw para CC sessions |

### Documentación Oficial

- [code.claude.com](https://code.claude.com) — Docs oficiales de Claude Code
- [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents) — Subagentes
- [docs.openclaw.ai](https://docs.openclaw.ai) — Docs de OpenClaw
- [docs.openclaw.ai/tools/skills](https://docs.openclaw.ai/tools/skills) — Skills

### Lecturas Recomendadas

- **nathanflurry.com** — "You're holding it wrong" (integración CC+OpenClaw)
- **dplooy.com** — Claude Code Tasks Complete Guide (referencia técnica más profunda)
- **claudefa.st** — Task Management: Native Multi-Session AI
- **madebynathan.com** — "Everything I've Done with OpenClaw"

### Comunidad

- r/ClaudeCode, r/ClaudeAI — Workflows y tips
- X: @adocomplete (Ado, Anthropic), @trq212 (Thariq), @NathanFlurry

---

## Cheatsheet Rápido

```bash
# Iniciar sesión
claude

# One-shot
claude -p "qué hace este repo"

# Continuar sesión
claude --continue

# Con modelo específico
claude --model claude-sonnet-4-20250514

# Tasks compartidas entre terminales
CLAUDE_CODE_TASK_LIST_ID=mi-proyecto claude

# Agregar MCP server
claude mcp add nombre -- comando args

# En CLAUDE.md del proyecto, poner:
# - Stack tecnológico
# - Convenciones de código
# - Patrones preferidos
# - Archivos/dirs importantes
```

---

*Guía compilada el 2026-02-18. Fuentes: 70+ recursos de X, Reddit, GitHub, blogs y docs oficiales.*
