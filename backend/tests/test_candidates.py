import os
import io
import time
import pytest
from unittest.mock import AsyncMock, patch
from app.services.llm import MockProvider, set_llm_provider, EvaluationResult

@pytest.fixture(autouse=True)
def inject_mock_llm():
    mock = MockProvider()
    set_llm_provider(mock, "mock")
    return mock

def test_1_create_job(client):
    res = client.post("/jobs", json={
        "title": "Senior Full-Stack Engineer",
        "description": "React, TypeScript, and Python developer.",
        "requiredSkills": ["React", "TypeScript", "Python", "Docker"],
        "minYearsExperience": 4,
        "skillsWeight": 50,
        "experienceWeight": 35,
        "educationWeight": 15
    })
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["title"] == "Senior Full-Stack Engineer"
    assert data["requiredSkills"] == ["React", "TypeScript", "Python", "Docker"]
    assert data["minYearsExperience"] == 4
    assert data["skillsWeight"] == 50
    assert data["experienceWeight"] == 35
    assert data["educationWeight"] == 15

def test_2_reject_invalid_job_weights(client):
    # Weights do not sum to 100
    res = client.post("/jobs", json={
        "title": "Invalid Weights Job",
        "description": "Weights sum to 90",
        "requiredSkills": ["Python"],
        "minYearsExperience": 2,
        "skillsWeight": 50,
        "experienceWeight": 20,
        "educationWeight": 20
    })
    assert res.status_code == 400
    assert "error" in res.json()
    assert res.json()["error"]["code"] == "INVALID_WEIGHT_SUM"

def test_3_upload_candidate_and_evaluate(client, inject_mock_llm):
    job_res = client.post("/jobs", json={
        "title": "Backend Python Developer",
        "description": "FastAPI, PostgreSQL and Docker role.",
        "requiredSkills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
        "minYearsExperience": 3,
        "skillsWeight": 50,
        "experienceWeight": 35,
        "educationWeight": 15
    })
    job_id = job_res.json()["id"]

    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_resume.txt")
    with open(fixture_path, "rb") as f:
        file_bytes = f.read()

    # Test zero-prompt upload (no name/email passed, auto-extracted from document)
    res = client.post(
        f"/jobs/{job_id}/candidates",
        files={"resume": ("sample_resume.txt", io.BytesIO(file_bytes), "text/plain")}
    )

    assert res.status_code == 201
    data = res.json()
    assert data["name"] is not None
    assert data["email"] is not None
    assert data["status"] in ["new", "shortlisted", "rejected"]

    # Evaluation assertion
    assert data["evaluation"] is not None
    ev = data["evaluation"]
    assert 0 <= ev["matchScore"] <= 100
    assert ev["recommendation"] in ["strong", "maybe", "no"]
    assert isinstance(ev["matchedSkills"], list)
    assert isinstance(ev["missingSkills"], list)
    assert len(ev["summary"]) > 10
    assert ev["status"] == "complete"
    assert ev["rawPrompt"] is not None
    assert ev["rawResponse"] is not None

def test_4_strict_experience_gating(client, inject_mock_llm):
    # Job requires 5 years minimum experience
    job_res = client.post("/jobs", json={
        "title": "Senior AI Architect",
        "description": "5+ years of experience required",
        "requiredSkills": ["Python", "Docker"],
        "minYearsExperience": 5,
        "skillsWeight": 50,
        "experienceWeight": 35,
        "educationWeight": 15
    })
    job_id = job_res.json()["id"]

    # Resume has only 1 year experience
    junior_resume = (
        "John Junior\njohn@example.com\n\n"
        "Junior Developer with 1 year of experience in Python and Docker.\n"
        "Experience: 2023 - 2024 Software Intern at TechCo."
    )

    res = client.post(
        f"/jobs/{job_id}/candidates",
        files={"resume": ("junior_resume.txt", io.BytesIO(junior_resume.encode("utf-8")), "text/plain")}
    )

    assert res.status_code == 201
    data = res.json()
    # Experience penalty: score should be capped below 75 and recommendation CANNOT be strong
    assert data["evaluation"]["recommendation"] != "strong"
    assert data["evaluation"]["matchScore"] <= 74
    assert "below the minimum requirement" in data["evaluation"]["summary"]

def test_5_no_recomputation_on_get(client, inject_mock_llm):
    job_res = client.post("/jobs", json={
        "title": "Full-Stack Engineer",
        "description": "Web developer role",
        "requiredSkills": ["React", "Python"],
        "minYearsExperience": 2
    })
    job_id = job_res.json()["id"]

    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_resume.txt")
    with open(fixture_path, "rb") as f:
        file_bytes = f.read()

    with patch.object(inject_mock_llm, "evaluate_candidate", wraps=inject_mock_llm.evaluate_candidate) as spy:
        upload_res = client.post(
            f"/jobs/{job_id}/candidates",
            files={"resume": ("sample_resume.txt", io.BytesIO(file_bytes), "text/plain")}
        )
        assert upload_res.status_code == 201
        assert spy.call_count == 1

        # First GET /jobs/:id/candidates
        get_res_1 = client.get(f"/jobs/{job_id}/candidates")
        assert get_res_1.status_code == 200
        assert len(get_res_1.json()) == 1

        # Second GET /jobs/:id/candidates
        get_res_2 = client.get(f"/jobs/{job_id}/candidates")
        assert get_res_2.status_code == 200

        # CRITICAL: No additional LLM call was made during GET requests
        assert spy.call_count == 1

def test_6_reject_unsupported_file_type(client):
    job_res = client.post("/jobs", json={
        "title": "QA Engineer",
        "description": "Testing role",
        "requiredSkills": ["Pytest"],
        "minYearsExperience": 1
    })
    job_id = job_res.json()["id"]

    res = client.post(
        f"/jobs/{job_id}/candidates",
        files={"resume": ("invalid.xyz", io.BytesIO(b"bad content"), "application/octet-stream")}
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_FILE_TYPE"

def test_7_candidate_status_patch(client):
    job_res = client.post("/jobs", json={
        "title": "DevOps Engineer",
        "description": "Cloud",
        "requiredSkills": ["Docker", "AWS"],
        "minYearsExperience": 2
    })
    job_id = job_res.json()["id"]

    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_resume.txt")
    with open(fixture_path, "rb") as f:
        file_bytes = f.read()

    upload_res = client.post(
        f"/jobs/{job_id}/candidates",
        files={"resume": ("sample_resume.txt", io.BytesIO(file_bytes), "text/plain")}
    )
    cand_id = upload_res.json()["id"]

    # Invalid status -> 400
    bad_patch = client.patch(f"/candidates/{cand_id}", json={"status": "hired_invalid"})
    assert bad_patch.status_code == 400

    # Shortlist -> 200
    good_patch = client.patch(f"/candidates/{cand_id}", json={"status": "shortlisted"})
    assert good_patch.status_code == 200
    assert good_patch.json()["status"] == "shortlisted"

    # Reject -> 200
    reject_patch = client.patch(f"/candidates/{cand_id}", json={"status": "rejected"})
    assert reject_patch.status_code == 200
    assert reject_patch.json()["status"] == "rejected"

def test_8_enhance_job_description(client):
    res = client.post("/jobs/enhance", json={
        "rawText": "Looking for senior python engineer with experience in django, fastapi and postgresql. 4 years minimum."
    })
    assert res.status_code == 200
    data = res.json()
    assert "title" in data
    assert "description" in data
    assert isinstance(data["requiredSkills"], list)
    assert len(data["requiredSkills"]) > 0
    assert data["minYearsExperience"] >= 0

def test_9_bulk_upload_queue_worker(client):
    job = client.post("/jobs", json={
        "title": "Batch Intake Job",
        "description": "Testing bulk upload queue",
        "requiredSkills": ["Python", "React"],
        "minYearsExperience": 1
    }).json()

    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_resume.txt")
    with open(fixture_path, "rb") as f:
        valid_bytes = f.read()

    # Enqueue bulk batch
    res = client.post(
        f"/jobs/{job['id']}/candidates/bulk",
        files=[
            ("resumes", ("valid_resume.txt", io.BytesIO(valid_bytes), "text/plain")),
            ("resumes", ("invalid.xyz", io.BytesIO(b"bad file"), "application/octet-stream"))
        ]
    )

    assert res.status_code == 200
    data = res.json()
    assert "batchId" in data
    assert data["total"] == 2
    batch_id = data["batchId"]

    # Poll status endpoint
    status_res = client.get(f"/jobs/{job['id']}/candidates/bulk/{batch_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["batchId"] == batch_id
    assert status_data["total"] == 2
    assert status_data["status"] in ["queued", "processing", "completed"]
