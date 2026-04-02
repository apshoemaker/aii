# Security

## API Key Management

- `ANTHROPIC_API_KEY` and `TAVILY_API_KEY` live in `.env` (root level).
- `.env` is in `.gitignore` — never committed.
- `.env.example` provides the template with placeholder values.
- Keys are only loaded server-side via `python-dotenv`. The frontend never sees them.
- Docker: keys passed via `env_file: .env` in docker-compose.

## Calculator Tool Safety

The `calculate()` tool uses `eval()` with a restricted environment:

```python
eval(expression, {"__builtins__": {}}, SAFE_NAMES)
```

- `__builtins__` is empty — no `import`, `open`, `exec`, `__import__`, etc.
- `SAFE_NAMES` contains only math functions and constants.
- No file system access, no network access, no code execution.

## WebSocket

- No authentication on the `/ws` endpoint (open access).
- Each connection gets a unique thread_id (UUID) for conversation isolation.
- Malformed JSON is caught and returns an error message (no crash).
- For production: add rate limiting, authentication, and WSS (TLS).

## External Data

- JPL Horizons: public API, no auth required.
- NASA GCS: public bucket, no auth required.
- Tavily: API key required, server-side only.
- YouTube (yt-dlp): public streams only, no auth.
