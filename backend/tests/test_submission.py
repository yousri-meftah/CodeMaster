from pathlib import Path

import pytest

from app.models import User
from tests.test_auth import _register_user, _login_user
from app.services import piston


def _auth_headers(client, db_session):
    _register_user(client, email="submit@example.com")
    user = db_session.query(User).filter(User.email == "submit@example.com").first()
    user.is_admin = True
    db_session.commit()

    login = _login_user(client, email="submit@example.com")
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_problem(
    client,
    headers,
    *,
    title: str,
    difficulty: str,
    description: str,
    constraints: str,
    tag_name: str,
    test_cases: list[dict],
):
    tag_resp = client.post("/tag/", json={"name": tag_name}, headers=headers)
    assert tag_resp.status_code == 200, tag_resp.text
    tag_id = tag_resp.json()["id"]
    payload = {
        "title": title,
        "difficulty": difficulty,
        "external_link": None,
        "description": description,
        "constraints": constraints,
        "tag_ids": [tag_id],
        "test_cases": test_cases,
    }
    create_resp = client.post("/problem/", json=payload, headers=headers)
    assert create_resp.status_code == 200, create_resp.text
    return create_resp.json()["id"]


def _piston_available() -> bool:
    try:
        piston.get_runtime("python")
        return True
    except Exception:
        return False


def _algo_compiler_available() -> bool:
    return Path(piston.settings.ALGO_COMPILER_JAR).exists()


def test_get_runtime_prefers_requested_language_on_cold_cache(monkeypatch):
    piston._RUNTIME_CACHE.clear()
    piston._RUNTIME_CACHE_TS = 0.0

    monkeypatch.setattr(
        piston,
        "_fetch_runtimes",
        lambda: [
            {"language": "c", "version": "10.2.0", "aliases": ["gcc"]},
            {"language": "c++", "version": "10.2.0", "aliases": ["cpp", "g++"]},
            {"language": "javascript", "version": "20.11.1", "aliases": ["js"]},
            {"language": "python", "version": "3.11.0", "aliases": ["py", "python3"]},
        ],
    )

    language, version = piston.get_runtime("cpp")

    assert language == "c++"
    assert version == "10.2.0"


@pytest.mark.skipif(not _piston_available(), reason="Piston execution service is unavailable")
def test_run_submission_executes_real_code_and_returns_ac(client, db_session):
    headers = _auth_headers(client, db_session)
    problem_id = _create_problem(
        client,
        headers,
        title="Sum of Two Numbers",
        difficulty="Easy",
        description="Return the sum of two integers.",
        constraints="Input size small.",
        tag_name="math",
        test_cases=[
            {"input_text": "1 2", "output_text": "3", "is_sample": True, "order": 0},
            {"input_text": "2 2", "output_text": "4", "is_sample": False, "order": 1},
        ],
    )

    payload = {
        "problem_id": problem_id,
        "language": "python",
        "code": "a, b = map(int, input().split())\nprint(a + b)",
    }
    resp = client.post("/submission/run", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["verdict"] == "AC", body
    assert body["passed"] == 1, body
    assert body["total"] == 1, body
    assert len(body["cases"]) == 1, body
    assert body["cases"][0]["is_sample"] is True, body
    assert body["cases"][0]["stdout"].strip() == "3", body
    assert body["cases"][0]["passed"] is True, body
    assert body["hidden"] is None, body


@pytest.mark.skipif(not _piston_available(), reason="Piston execution service is unavailable")
def test_run_submission_executes_real_code_and_returns_wa_for_wrong_answer(client, db_session):
    headers = _auth_headers(client, db_session)
    problem_id = _create_problem(
        client,
        headers,
        title="Sum of Two Numbers",
        difficulty="Easy",
        description="Return the sum of two integers.",
        constraints="Input size small.",
        tag_name="math",
        test_cases=[
            {"input_text": "1 2", "output_text": "3", "is_sample": True, "order": 0},
            {"input_text": "2 2", "output_text": "4", "is_sample": False, "order": 1},
        ],
    )

    payload = {
        "problem_id": problem_id,
        "language": "python",
        "code": "a, b = map(int, input().split())\nprint(a + b + 1)",
    }
    resp = client.post("/submission/run", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["verdict"] == "WA", body
    assert body["passed"] == 0, body
    assert body["total"] == 1, body
    assert len(body["cases"]) == 1, body
    assert body["cases"][0]["stdout"].strip() == "4", body
    assert body["cases"][0]["output_text"].strip() == "3", body
    assert body["cases"][0]["passed"] is False, body
    assert body["hidden"] is None, body


@pytest.mark.skipif(not _piston_available(), reason="Piston execution service is unavailable")
def test_submit_submission_executes_real_code_and_counts_hidden_cases(client, db_session):
    headers = _auth_headers(client, db_session)
    problem_id = _create_problem(
        client,
        headers,
        title="Sum of Two Numbers",
        difficulty="Easy",
        description="Return the sum of two integers.",
        constraints="Input size small.",
        tag_name="math",
        test_cases=[
            {"input_text": "1 2", "output_text": "3", "is_sample": True, "order": 0},
            {"input_text": "2 2", "output_text": "4", "is_sample": False, "order": 1},
        ],
    )

    payload = {
        "problem_id": problem_id,
        "language": "python",
        "code": "a, b = map(int, input().split())\nprint(a + b)",
    }
    resp = client.post("/submission/submit", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["verdict"] == "AC", body
    assert body["passed"] == 2, body
    assert body["total"] == 2, body
    assert body["hidden"] == {"passed": 1, "total": 1}, body
    assert len(body["cases"]) == 1, body
    assert body["cases"][0]["is_sample"] is True, body
    assert body["cases"][0]["stdout"].strip() == "3", body


def test_submission_run_requires_sample_cases(client, db_session):
    headers = _auth_headers(client, db_session)
    problem_id = _create_problem(
        client,
        headers,
        title="Sum of Two Numbers",
        difficulty="Easy",
        description="Return the sum of two integers.",
        constraints="Input size small.",
        tag_name="math",
        test_cases=[{"input_text": "2 2", "output_text": "4", "is_sample": False, "order": 0}],
    )

    payload = {
        "problem_id": problem_id,
        "language": "python",
        "code": "print('hello')",
    }
    resp = client.post("/submission/run", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "No sample test cases available" in resp.json()["detail"]


@pytest.mark.skipif(not _piston_available(), reason="Piston execution service is unavailable")
def test_run_submission_two_sum_problem_returns_ac(client, db_session):
    headers = _auth_headers(client, db_session)
    problem_id = _create_problem(
        client,
        headers,
        title="Two Sum",
        difficulty="Easy",
        description="Return the two indices whose values sum to the target.",
        constraints="Exactly one valid answer exists.",
        tag_name="arrays",
        test_cases=[
            {"input_text": "4\n2 7 11 15\n9", "output_text": "0 1", "is_sample": True, "order": 0},
            {"input_text": "3\n3 2 4\n6", "output_text": "1 2", "is_sample": False, "order": 1},
        ],
    )

    payload = {
        "problem_id": problem_id,
        "language": "python",
        "code": (
            "import sys\n"
            "data = sys.stdin.read().strip().split()\n"
            "n = int(data[0])\n"
            "nums = list(map(int, data[1:1+n]))\n"
            "target = int(data[1+n])\n"
            "seen = {}\n"
            "for i, num in enumerate(nums):\n"
            "    need = target - num\n"
            "    if need in seen:\n"
            "        print(seen[need], i)\n"
            "        break\n"
            "    seen[num] = i\n"
        ),
    }
    resp = client.post("/submission/run", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["verdict"] == "AC", body
    assert body["passed"] == 1, body
    assert body["total"] == 1, body
    assert body["cases"][0]["stdout"].strip() == "0 1", body


@pytest.mark.skipif(not _piston_available(), reason="Piston execution service is unavailable")
def test_run_submission_valid_parentheses_problem_returns_ac(client, db_session):
    headers = _auth_headers(client, db_session)
    problem_id = _create_problem(
        client,
        headers,
        title="Valid Parentheses",
        difficulty="Easy",
        description="Return true when the bracket sequence is valid.",
        constraints="Input contains only bracket characters.",
        tag_name="stack",
        test_cases=[
            {"input_text": "()[]{}", "output_text": "true", "is_sample": True, "order": 0},
            {"input_text": "(]", "output_text": "false", "is_sample": False, "order": 1},
        ],
    )

    payload = {
        "problem_id": problem_id,
        "language": "python",
        "code": (
            "s = input().strip()\n"
            "stack = []\n"
            "pairs = {')': '(', ']': '[', '}': '{'}\n"
            "for ch in s:\n"
            "    if ch in '([{':\n"
            "        stack.append(ch)\n"
            "    else:\n"
            "        if not stack or stack.pop() != pairs[ch]:\n"
            "            print('false')\n"
            "            break\n"
            "else:\n"
            "    print('true' if not stack else 'false')\n"
        ),
    }
    resp = client.post("/submission/run", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["verdict"] == "AC", body
    assert body["passed"] == 1, body
    assert body["total"] == 1, body
    assert body["cases"][0]["stdout"].strip() == "true", body


@pytest.mark.skipif(not _algo_compiler_available(), reason="Algo compiler jar is unavailable")
def test_run_submission_algo_problem_returns_ac(client, db_session):
    headers = _auth_headers(client, db_session)
    problem_id = _create_problem(
        client,
        headers,
        title="Algo Sum of Two Numbers",
        difficulty="Easy",
        description="Return the sum of two integers using algo.",
        constraints="Input size small.",
        tag_name="algo",
        test_cases=[
            {"input_text": "1\n2", "output_text": "3", "is_sample": True, "order": 0},
            {"input_text": "2\n2", "output_text": "4", "is_sample": False, "order": 1},
        ],
    )

    payload = {
        "problem_id": problem_id,
        "language": "algo",
        "code": (
            "algorithme solve\n\n"
            "variables\n"
            "    a : entier\n"
            "    b : entier\n\n"
            "debut\n"
            "    lire(a)\n"
            "    lire(b)\n"
            "    ecrireln(a+b)\n"
            "fin\n"
        ),
    }
    resp = client.post("/submission/run", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["verdict"] == "AC", body
    assert body["passed"] == 1, body
    assert body["total"] == 1, body
    assert body["cases"][0]["stdout"].strip() == "3", body


@pytest.mark.skipif(not _algo_compiler_available(), reason="Algo compiler jar is unavailable")
def test_run_submission_algo_problem_returns_wa_for_wrong_answer(client, db_session):
    headers = _auth_headers(client, db_session)
    problem_id = _create_problem(
        client,
        headers,
        title="Algo Sum of Two Numbers",
        difficulty="Easy",
        description="Return the sum of two integers using algo.",
        constraints="Input size small.",
        tag_name="algo",
        test_cases=[
            {"input_text": "1\n2", "output_text": "3", "is_sample": True, "order": 0},
            {"input_text": "2\n2", "output_text": "4", "is_sample": False, "order": 1},
        ],
    )

    payload = {
        "problem_id": problem_id,
        "language": "algo",
        "code": (
            "algorithme solve\n\n"
            "variables\n"
            "    a : entier\n"
            "    b : entier\n\n"
            "debut\n"
            "    lire(a)\n"
            "    lire(b)\n"
            "    ecrireln(a+b+1)\n"
            "fin\n"
        ),
    }
    resp = client.post("/submission/run", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["verdict"] == "WA", body
    assert body["passed"] == 0, body
    assert body["total"] == 1, body
    assert body["cases"][0]["stdout"].strip() == "4", body
