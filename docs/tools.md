# Tools

tldr-spec registers two custom tools with pi. These handle all user interactions during discovery and specify phases.

## ask_question

A single-question tool with a custom TUI. Presents numbered options the user navigates with arrow keys, plus a built-in free-text input.

### Interface

```
��───────────────────────────────────────��──────
 How do you want to handle the layout?
 You have a Card component at src/components/Card.tsx

  1. Reuse Card (consistent with existing pages)
> 2. Reuse ListView (fits if data-heavy)
  3. New timeline component
  4. Something else (I'll explain)
  5. Let's discuss this

 Up/Down navigate - Enter to select - Esc to cancel
───────────────────────────────────────────────
```

When the user selects "Something else (I'll explain)", an inline text editor appears. They type their answer and press Enter to submit. Pressing Escape returns to the options list.

When the user selects "Let's discuss this", the LLM switches to conversational mode -- asking follow-ups in plain text without tools until it has enough clarity to resume structured questions.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `question` | string | The question to ask |
| `options` | array | 2-6 options, each with `label` (required) and `description` (optional, shown below the label in muted text) |

### Return values

- **User selects an option**: `"User selected: 2. Reuse ListView"`
- **User types free text**: `"User wrote: I want a kanban board layout"`
- **User picks "Let's discuss this"**: `"User wants to discuss this topic in conversation..."` (instructs LLM to switch to conversational mode)
- **User cancels (Escape)**: `"User cancelled the selection."`

### Usage in prompts

The phase prompts instruct the LLM to use `ask_question` for every user interaction. The tool automatically appends two special options -- "Something else (I'll explain)" and "Let's discuss this" -- the LLM does not need to include these.

## ask_multi_select

A checkbox multi-select tool. The user toggles items on/off and confirms their selection.

### Interface

```
───────────────────────────────────────────────
 Which areas do you want to discuss?

> [x] Session handling (no session middleware exists yet)
  [ ] Error responses (current pattern: generic 500)
  [x] Multi-device policy
  [ ] Recovery flow

  Done (2 selected)

 Up/Down navigate - Enter/Space to toggle - Esc to cancel
───────────────────────────────────────────────
```

At least one item must be selected before "Done" is accepted.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `question` | string | The question to ask |
| `options` | array | Items to select from, each with `label` (required) and `description` (optional) |

### Return values

- **User selects items**: `"User selected: Session handling, Multi-device policy"`
- **User cancels (Escape)**: `"User cancelled the selection."`

### Usage in prompts

The phase prompts instruct the LLM to use `ask_multi_select` specifically for gray area selection -- the step where the user chooses which topics to discuss. All other interactions use `ask_question`.

## Design Principles

### One question at a time

Both phases enforce a strict rule: one question per turn. The LLM never asks multiple questions in a single message and never asks questions in conversational text. Every user-facing question goes through one of these tools.

### Always a way out

`ask_question` always appends two escape hatches: "Something else (I'll explain)" for free-text input, and "Let's discuss this" for switching to open conversational mode. The user can always break out of structured options. After the LLM processes their response, it resumes with structured options for the next question.

### Code context in every option

The phase prompts instruct the LLM to cite existing code when presenting options. Instead of abstract choices, options reference real files, components, and patterns from the codebase.

### Non-interactive fallback

Both tools gracefully handle non-interactive mode (no UI available). They return an informational message so the LLM can adapt its approach.
