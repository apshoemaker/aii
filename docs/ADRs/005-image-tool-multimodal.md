# ADR 005: Multimodal ToolMessages for image analysis

**Status:** Accepted  
**Date:** 2026-04-02

## Context

The screenshot and live feed tools capture images (base64 JPEG/PNG) for Claude to analyze. However, LangGraph's `ToolNode` returns tool results as plain strings. When the base64 data was returned as text, Claude couldn't see the image and hallucinated its contents.

## Decision

Use a custom `image_aware_tool_node` that intercepts tool results containing the marker `__IMAGE_TOOL_RESULT__` and converts them into multimodal `ToolMessage` content blocks with `{"type": "image", "source": {"type": "base64", ...}}`.

## Rationale

- Claude's vision API requires structured image content blocks, not base64 strings in text.
- The marker-based approach keeps tools simple (they return strings) while the graph node handles the multimodal conversion.
- Alternative approaches (custom tool return types, injecting HumanMessages) were more invasive to the LangGraph flow.

## Consequences

- Tools that return images must use the `__IMAGE_TOOL_RESULT__` marker format.
- The custom tool node adds ~30 lines to `graph.py`.
- Claude accurately describes image contents instead of hallucinating.
