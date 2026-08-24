import uuid
import asyncio
import logging
from typing import Dict, List, Any, Optional
from ..database import SessionLocal
from ..models import Candidate, Job
from ..services.parser import parse_resume_bytes
from ..services.evaluation import run_candidate_evaluation, format_candidate

logger = logging.getLogger(__name__)

class BatchJobItem:
    def __init__(self, filename: str, content_bytes: bytes):
        self.filename = filename
        self.content_bytes = content_bytes

class BatchTask:
    def __init__(self, batch_id: str, job_id: str, total: int):
        self.batch_id = batch_id
        self.job_id = job_id
        self.status = "queued"  # queued | processing | completed | failed
        self.total = total
        self.processed_count = 0
        self.progress = 0
        self.current_file: Optional[str] = None
        self.results: List[Dict[str, Any]] = []

class BatchQueueManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BatchQueueManager, cls).__new__(cls)
            cls._instance.batches: Dict[str, BatchTask] = {}
        return cls._instance

    def create_batch(self, job_id: str, total: int) -> BatchTask:
        batch_id = str(uuid.uuid4())
        task = BatchTask(batch_id, job_id, total)
        self.batches[batch_id] = task
        return task

    def get_batch(self, batch_id: str) -> Optional[BatchTask]:
        return self.batches.get(batch_id)

    async def process_batch_background(self, batch_id: str, items: List[BatchJobItem]):
        task = self.get_batch(batch_id)
        if not task:
            return

        task.status = "processing"
        semaphore = asyncio.Semaphore(2)  # Process up to 2 concurrently to avoid rate limits

        async def process_single_item(item: BatchJobItem):
            async with semaphore:
                task.current_file = item.filename
                db = SessionLocal()
                try:
                    # Enable render_images=True so PDFs have all page images rendered for Vision LLM
                    parsed = parse_resume_bytes(item.content_bytes, item.filename, render_images=True)
                    cand_name = parsed.inferred_name or item.filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
                    cand_email = parsed.inferred_email or f"candidate_{uuid.uuid4().hex[:8]}@applicant.local"

                    candidate = Candidate(
                        job_id=task.job_id,
                        name=cand_name,
                        email=cand_email,
                        resume_text=parsed.text,
                        years_experience=parsed.inferred_years_experience,
                        status="new",
                    )
                    db.add(candidate)
                    db.commit()
                    db.refresh(candidate)

                    # Pass page_images_base64 to multi-modal vision evaluation
                    await run_candidate_evaluation(
                        db,
                        candidate.id,
                        task.job_id,
                        page_images_base64=parsed.page_images_base64
                    )
                    db.refresh(candidate)

                    result_item = {
                        "filename": item.filename,
                        "status": "success",
                        "candidateId": candidate.id,
                        "candidate": format_candidate(candidate, task.job_id)
                    }
                except Exception as e:
                    logger.error(f"Bulk item error ({item.filename}): {e}")
                    error_msg = "Failed to process resume"
                    if hasattr(e, "detail") and isinstance(e.detail, dict) and "error" in e.detail:
                        error_msg = e.detail["error"].get("message", str(e))
                    else:
                        error_msg = str(e)

                    result_item = {
                        "filename": item.filename,
                        "status": "error",
                        "error": error_msg
                    }
                finally:
                    db.close()

                task.results.append(result_item)
                task.processed_count += 1
                task.progress = int(round((task.processed_count / task.total) * 100))

        # Run tasks with concurrency limit
        await asyncio.gather(*[process_single_item(it) for it in items])
        task.status = "completed"
        task.current_file = None
        logger.info(f"Batch queue {batch_id} completed. {task.processed_count}/{task.total} processed.")

queue_manager = BatchQueueManager()
