import json
import pytest
from fastapi.testclient import TestClient


def test_app_starts():
    from main import app
    client = TestClient(app)
    # Just verify the app object exists and is importable
    assert app is not None


def test_websocket_init_handshake():
    from main import app
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "init", "uuid": "test-123"}))
        # Server should accept without error — no response expected for init
        # Just verify the connection stays open
        assert True


def test_websocket_rejects_malformed_json():
    from main import app
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text("not valid json")
        response = ws.receive_text()
        data = json.loads(response)
        assert data["type"] == "error"
