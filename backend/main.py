import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"Starting AI Resume Screener Backend on http://127.0.0.1:{settings.port}")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=False
    )
