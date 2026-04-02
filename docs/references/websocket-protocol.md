# WebSocket Protocol Reference

Connection: `ws://localhost:5199/ws` (proxied to backend port 8000)

## Client → Server

### Init
```json
{"type": "init", "uuid": "crypto.randomUUID()"}
```
Sent on connection open. UUID used as thread_id for conversation memory.

### Message
```json
{"type": "message", "uuid": "...", "content": "Where is Orion?"}
```

### Screenshot Response
```json
{"type": "screenshot", "uuid": "...", "data": "<base64 PNG>"}
```
Sent in response to a `screenshot_request` from the server.

## Server → Client

### Streaming Token
```json
{"type": "token", "content": "The spacecraft is currently..."}
```

### Tool Start/End
```json
{"type": "tool_start", "name": "horizons_query"}
{"type": "tool_end", "name": "horizons_query"}
```

### Screenshot Request
```json
{"type": "screenshot_request"}
```
Client should capture canvas and respond with screenshot message.

### End of Response
```json
{"type": "end"}
```

### Error
```json
{"type": "error", "message": "Agent error: ..."}
```
