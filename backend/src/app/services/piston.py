import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional, Tuple

import requests

from config import settings

_RUNTIME_CACHE: Dict[str, str] = {}
_RUNTIME_CACHE_TS: float = 0.0
_RUNTIME_CACHE_TTL_SECONDS = 60 * 10


def _normalize_base_url() -> str:
    return settings.PISTON_URL.rstrip("/")


def _fetch_runtimes() -> List[Dict]:
    url = f"{_normalize_base_url()}/runtimes"
    resp = requests.get(url, timeout=settings.PISTON_TIMEOUT_SECONDS)
    try:
        resp.raise_for_status()
    except requests.HTTPError as exc:
        raise RuntimeError(f"Piston /runtimes error: {resp.status_code} {resp.text}") from exc
    return resp.json()


def _normalize(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _pick_runtime(runtimes: List[Dict], language: str) -> Optional[Tuple[str, str]]:
    lang = _normalize(language)
    candidates = [
        rt
        for rt in runtimes
        if _normalize(rt.get("language")) == lang
        or lang in {_normalize(a) for a in (rt.get("aliases") or [])}
    ]
    if not candidates:
        return None
    # choose the highest version (lexicographic is ok for piston versions)
    candidates.sort(key=lambda rt: rt.get("version", ""), reverse=True)
    best = candidates[0]
    return best.get("language"), best.get("version")


def _runtime_key(language: str, version: str) -> str:
    return f"{language}:{version}"


def get_runtime(language: str) -> Tuple[str, str]:
    global _RUNTIME_CACHE_TS
    now = time.time()
    requested_lang = _normalize(language)
    if _RUNTIME_CACHE and (now - _RUNTIME_CACHE_TS) < _RUNTIME_CACHE_TTL_SECONDS:
        version = _RUNTIME_CACHE.get(requested_lang)
        if version:
            return requested_lang, version

    runtimes = _fetch_runtimes()
    _RUNTIME_CACHE.clear()
    for rt in runtimes:
        runtime_lang = _normalize(rt.get("language"))
        version = rt.get("version")
        if runtime_lang and version and runtime_lang not in _RUNTIME_CACHE:
            _RUNTIME_CACHE[runtime_lang] = version
        for alias in rt.get("aliases") or []:
            alias_norm = _normalize(alias)
            if alias_norm and version and alias_norm not in _RUNTIME_CACHE:
                _RUNTIME_CACHE[alias_norm] = version
    _RUNTIME_CACHE_TS = now

    # Try exact/alias match first, then known synonyms for our UI languages
    picked = _pick_runtime(runtimes, requested_lang)
    if not picked:
        synonyms = {
            "javascript": ["javascript", "js", "node", "nodejs"],
            "python": ["python", "py"],
            "java": ["java"],
            "cpp": ["cpp", "c++", "cxx"],
        }
        for alt in synonyms.get(requested_lang, []):
            picked = _pick_runtime(runtimes, alt)
            if picked:
                break
    if not picked:
        raise ValueError(f"Unsupported language: {language}")
    return picked


def _normalize_output(text: Optional[str]) -> str:
    if text is None:
        return ""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in normalized.split("\n")]
    return "\n".join(lines).strip()


def _prepare_algo_stdin(source_code: str, stdin: str) -> str:
    raw_stdin = stdin or ""
    if "\n" in raw_stdin or "\r" in raw_stdin:
        return raw_stdin

    read_calls = len(re.findall(r"\blire\s*\(", source_code, flags=re.IGNORECASE))
    if read_calls > 1 and re.search(r"\s+", raw_stdin):
        return re.sub(r"\s+", "\n", raw_stdin.strip()) + "\n"

    return raw_stdin


def _execute_algo_compiler(source_code: str, stdin: str) -> Dict:
    jar_path = Path(settings.ALGO_COMPILER_JAR)
    if not jar_path.exists():
        raise RuntimeError(f"Algo compiler jar not found: {jar_path}")

    with tempfile.NamedTemporaryFile("w", suffix=".algo", delete=False, encoding="utf-8") as temp_file:
        temp_file.write(source_code)
        temp_path = Path(temp_file.name)

    try:
        completed = subprocess.run(
            [settings.JAVA_BIN, "-jar", str(jar_path), str(temp_path)],
            input=_prepare_algo_stdin(source_code, stdin),
            text=True,
            capture_output=True,
            timeout=settings.PISTON_TIMEOUT_SECONDS,
        )
        return {
            "run": {
                "stdout": completed.stdout,
                "stderr": completed.stderr,
                "code": completed.returncode,
                "signal": None,
            }
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "run": {
                "stdout": exc.stdout or "",
                "stderr": (exc.stderr or "") + "\nExecution timed out",
                "code": 124,
                "signal": "timeout",
            }
        }
    except FileNotFoundError as exc:
        raise RuntimeError(f"Java runtime not found: {settings.JAVA_BIN}") from exc
    finally:
        try:
            os.unlink(temp_path)
        except OSError:
            pass


def execute_piston(
    language: str,
    source_code: str,
    stdin: str,
) -> Dict:
    if _normalize(language) == "algo":
        return _execute_algo_compiler(source_code=source_code, stdin=stdin)

    lang, version = get_runtime(language)
    payload = {
        "language": lang,
        "version": version,
        "files": [{"content": source_code}],
        "stdin": stdin,
    }
    url = f"{_normalize_base_url()}/execute"
    resp = requests.post(url, json=payload, timeout=settings.PISTON_TIMEOUT_SECONDS)
    try:
        resp.raise_for_status()
    except requests.HTTPError as exc:
        raise RuntimeError(f"Piston /execute error: {resp.status_code} {resp.text}") from exc
    return resp.json()


def execute_test_cases(
    language: str,
    source_code: str,
    test_cases: List[Dict],
) -> List[Dict]:
    if not test_cases:
        return []

    def _run_test_case(tc: Dict) -> Dict:
        result = execute_piston(
            language=language,
            source_code=source_code,
            stdin=tc["input_text"],
        )

        run = result.get("run", {}) or {}
        stdout = run.get("stdout")
        stderr = run.get("stderr")
        status_code = run.get("code")
        signal = run.get("signal")

        normalized_expected = _normalize_output(tc.get("output_text"))
        normalized_actual = _normalize_output(stdout)
        passed = status_code == 0 and normalized_actual == normalized_expected

        status_desc = "OK" if status_code == 0 else "Runtime Error"
        if signal:
            status_desc = f"Signal {signal}"

        return {
            "id": tc.get("id"),
            "input_text": tc.get("input_text"),
            "output_text": tc.get("output_text"),
            "is_sample": tc.get("is_sample", True),
            "stdout": stdout,
            "stderr": stderr,
            "compile_output": None,
            "status_id": status_code,
            "status": status_desc,
            "time": None,
            "memory": None,
            "passed": passed,
        }

    max_workers = max(1, min(settings.EXECUTION_MAX_WORKERS, len(test_cases)))
    if max_workers == 1:
        return [_run_test_case(tc) for tc in test_cases]

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        return list(executor.map(_run_test_case, test_cases))


def summarize_results(results: List[Dict]) -> Dict[str, object]:
    total = len(results)
    passed = len([r for r in results if r.get("passed")])

    verdict = "AC"
    for r in results:
        status_id = r.get("status_id")
        if status_id is None:
            verdict = "IE"
            break
        if status_id != 0:
            verdict = "RE"
            break
        if not r.get("passed"):
            verdict = "WA"
    if total == 0:
        verdict = "NA"

    return {"passed": passed, "total": total, "verdict": verdict}
