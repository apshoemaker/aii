import pytest
from unittest.mock import AsyncMock, patch, MagicMock


def test_format_search_results():
    from tools.web_search import format_search_results
    results = [
        {"title": "Artemis II Launch", "url": "https://nasa.gov/a2", "content": "Mission launched successfully."},
        {"title": "Orion Update", "url": "https://nasa.gov/orion", "content": "Orion is on its way."},
    ]
    formatted = format_search_results(results)
    assert "Artemis II Launch" in formatted
    assert "https://nasa.gov/a2" in formatted
    assert "Orion Update" in formatted
    assert "1." in formatted
    assert "2." in formatted
