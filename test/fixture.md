---
title: Bilingual preview smoke test
tags: [translation, markdown]
---

# Context Window Management

A language model has a fixed **context window**. When the prompt grows beyond that window, the model silently drops the oldest tokens.

> The agent should summarize long conversations before they overflow.

## Configuration

- Set `max_tokens` to cap the output.
- Keep `temperature` at 1 for stable translations.
- See the [API reference](https://example.com/api).

| Field | Meaning |
| --- | --- |
| `context_window` | maximum input plus output tokens |
| `token` | the smallest unit of text |

```json
{ "model": "ernie", "max_tokens": 4096 }
```

Inline code like `max_tokens` and URLs like https://example.com/docs must stay intact.

A user asks a question. The agent decides whether a tutorial video can answer it. If the answer is not in the retrieved clip, the agent falls back to a full-text search and ranks the results by relevance.