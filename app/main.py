"""Root proxy module forwarding directly to backend.app.main (for Render/Heroku deployment)."""

from backend.app.main import app

__all__ = ["app"]
