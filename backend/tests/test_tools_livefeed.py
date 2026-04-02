import asyncio
import os
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


def test_extract_stream_url_command():
    """yt-dlp command should be constructed correctly."""
    from tools.livefeed import build_ytdlp_command
    cmd = build_ytdlp_command("https://www.youtube.com/watch?v=6RwfNBtepa4")
    assert "yt-dlp" in cmd[0]
    assert "--get-url" in cmd
    assert "6RwfNBtepa4" in " ".join(cmd)


def test_build_ffmpeg_command():
    """ffmpeg command should grab a single frame from a stream URL."""
    from tools.livefeed import build_ffmpeg_command
    cmd = build_ffmpeg_command("https://some-stream-url.m3u8", "/tmp/frame.jpg")
    assert "ffmpeg" in cmd[0]
    assert "-frames:v" in cmd
    assert "1" in cmd
    assert "/tmp/frame.jpg" in cmd


def test_frame_to_base64():
    """Should convert a JPEG file to base64 string."""
    from tools.livefeed import frame_to_base64
    # Create a tiny test JPEG (minimal valid JPEG: FFD8 ... FFD9)
    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    tmp.write(b'\xff\xd8\xff\xe0' + b'\x00' * 100 + b'\xff\xd9')
    tmp.close()
    try:
        b64 = frame_to_base64(tmp.name)
        assert isinstance(b64, str)
        assert len(b64) > 10
        # Should be valid base64
        import base64
        decoded = base64.b64decode(b64)
        assert decoded[:2] == b'\xff\xd8'  # JPEG magic bytes
    finally:
        os.unlink(tmp.name)


def test_frame_to_base64_missing_file():
    """Should return None for missing file."""
    from tools.livefeed import frame_to_base64
    result = frame_to_base64("/nonexistent/path/frame.jpg")
    assert result is None


@pytest.mark.asyncio
async def test_capture_live_frame_handles_ytdlp_failure():
    """Should return error message if yt-dlp fails."""
    from tools.livefeed import capture_live_frame
    with patch("tools.livefeed.run_subprocess", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = (1, "", "ERROR: Video unavailable")
        result = await capture_live_frame()
        assert "unavailable" in result.lower() or "failed" in result.lower() or "error" in result.lower()


@pytest.mark.asyncio
async def test_capture_live_frame_handles_ffmpeg_failure():
    """Should return error message if ffmpeg fails."""
    from tools.livefeed import capture_live_frame
    with patch("tools.livefeed.run_subprocess", new_callable=AsyncMock) as mock_run:
        # yt-dlp succeeds, ffmpeg fails
        mock_run.side_effect = [
            (0, "https://some-stream.m3u8\n", ""),
            (1, "", "ffmpeg error"),
        ]
        result = await capture_live_frame()
        assert "failed" in result.lower() or "error" in result.lower()


@pytest.mark.asyncio
async def test_capture_live_frame_success():
    """Should return base64 image data on success."""
    from tools.livefeed import capture_live_frame
    import tempfile

    fake_jpeg = b'\xff\xd8\xff\xe0' + b'\x00' * 100 + b'\xff\xd9'

    async def mock_run(cmd, timeout=None):
        # If it's ffmpeg, write a fake frame file
        if "ffmpeg" in cmd[0]:
            # Find the output path in the command
            out_path = cmd[-1]
            with open(out_path, "wb") as f:
                f.write(fake_jpeg)
            return (0, "", "")
        # yt-dlp
        return (0, "https://stream.m3u8\n", "")

    with patch("tools.livefeed.run_subprocess", side_effect=mock_run):
        result = await capture_live_frame()
        assert "frame captured" in result.lower() or "base64" in result.lower() or len(result) > 50
