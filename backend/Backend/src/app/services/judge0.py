import re
import time
from typing import Dict, List, Optional, Tuple

import requests

from config import settings

_LANG_CACHE: Dict[str, int] = {}
_LANG_CACHE_TS: float = 0.0
_LANG_CACHE_TTL_SECONDS = 60 * 10


def _judge0_headers() -> Dict[str, str]:
    if getattr(settings, "JUDGE0_API_KEY", None):
        return {settings.JUDGE0_API_KEY_HEADER: settings.JUDGE0_API_KEY}
    return {}


def _normalize_base_url() -> str:
    return settings.JUDGE0_URL.rstrip("/")


def _fetch_languages() -> List[Dict]:
    url = f"{_normalize_base_url()}/languages"
    resp = requests.get(url, headers=_judge0_headers(), timeout=settings.JUDGE0_TIMEOUT_SECONDS)
    try:
        resp.raise_for_status()
    except requests.HTTPError as exc:
        raise RuntimeError(f"Judge0 /languages error: {resp.status_code} {resp.text}") from exc
    return resp.json()


def _parse_version(name: str) -> Tuple[int, ...]:
    match = re.search(r"(\\d+(?:\\.\\d+)*)", name)
    if not match:
        return ()
    return tuple(int(part) for part in match.group(1).split("."))


def _pick_language_id(languages: List[Dict], predicate) -> Optional[int]:
    candidates = [lang for lang in languages if predicate(lang.get("name", ""))]
    if not candidates:
        return None
    candidates.sort(key=lambda lang: _parse_version(lang.get("name", "")), reverse=True)
    return candidates[0].get("id")


def _build_language_map(languages: List[Dict]) -> Dict[str, int]:
    mapping: Dict[str, int] = {}

    js_id = _pick_language_id(languages, lambda name: "JavaScript" in name and "Node" in name)
    py_id = _pick_language_id(languages, lambda name: name.startswith("Python"))
    java_id = _pick_language_id(languages, lambda name: name.startswith("Java"))
    cpp_id = _pick_language_id(languages, lambda name: name.startswith("C++"))

    if js_id is not None:
        mapping["javascript"] = js_id
    if py_id is not None:
        mapping["python"] = py_id
    if java_id is not None:
        mapping["java"] = java_id
    if cpp_id is not None:
        mapping["cpp"] = cpp_id

    return mapping


def get_language_id(language: str) -> int:
    global _LANG_CACHE_TS
    now = time.time()
    if _LANG_CACHE and (now - _LANG_CACHE_TS) < _LANG_CACHE_TTL_SECONDS:
        lang_id = _LANG_CACHE.get(language.lower())
        if lang_id:
            return lang_id

    languages = _fetch_languages()
    _LANG_CACHE.clear()
    _LANG_CACHE.update(_build_language_map(languages))
    _LANG_CACHE_TS = now

    lang_id = _LANG_CACHE.get(language.lower())
    if not lang_id:
        raise ValueError(f"Unsupported language: {language}")
    return lang_id


def _normalize_output(text: Optional[str]) -> str:
    if text is None:
        return ""
    normalized = text.replace("\\r\\n", "\\n").replace("\\r", "\\n")
    lines = [line.rstrip() for line in normalized.split("\\n")]
    return "\\n".join(lines).strip()


def submit_to_judge0(
    language: str,
    source_code: str,
    stdin: str,
    cpu_time_limit: Optional[float] = None,
    memory_limit: Optional[int] = None,
) -> Dict:
    payload: Dict[str, object] = {
        "language_id": get_language_id(language),
        "source_code": source_code,
        "stdin": stdin,
    }
    if cpu_time_limit is not None:
        payload["cpu_time_limit"] = cpu_time_limit
    if memory_limit is not None:
        payload["memory_limit"] = memory_limit

    url = f"{_normalize_base_url()}/submissions"
    resp = requests.post(
        url,
        headers=_judge0_headers(),
        params={"wait": "true", "base64_encoded": "false"},
        json=payload,
        timeout=settings.JUDGE0_TIMEOUT_SECONDS,
    )
    try:
        resp.raise_for_status()
    except requests.HTTPError as exc:
        raise RuntimeError(f"Judge0 /submissions error: {resp.status_code} {resp.text}") from exc
    return resp.json()


def execute_test_cases(
    language: str,
    source_code: str,
    test_cases: List[Dict],
    cpu_time_limit: Optional[float] = None,
    memory_limit: Optional[int] = None,
) -> List[Dict]:
    results: List[Dict] = []
    for tc in test_cases:
        submission = submit_to_judge0(
            language=language,
            source_code=source_code,
            stdin=tc["input_text"],
            cpu_time_limit=cpu_time_limit,
            memory_limit=memory_limit,
        )
        print("submission = ",submission)
        stdout = submission.get("stdout")
        stderr = submission.get("stderr")
        status = submission.get("status") or {}
        status_id = status.get("id")
        status_desc = status.get("description")
        compile_output = submission.get("compile_output")

        passed = False
        normalized_expected = _normalize_output(tc.get("output_text"))
        normalized_actual = _normalize_output(stdout)
        if status_id == 3 and normalized_actual == normalized_expected:
            passed = True

        results.append(
            {
                "id": tc.get("id"),
                "input_text": tc.get("input_text"),
                "output_text": tc.get("output_text"),
                "is_sample": tc.get("is_sample", True),
                "stdout": stdout,
                "stderr": stderr,
                "compile_output": compile_output,
                "status_id": status_id,
                "status": status_desc,
                "time": submission.get("time"),
                "memory": submission.get("memory"),
                "passed": passed,
            }
        )

    return results


def summarize_results(results: List[Dict]) -> Dict[str, object]:
    total = len(results)
    passed = len([r for r in results if r.get("passed")])

    verdict = "AC"
    for r in results:
        status_id = r.get("status_id")
        if status_id in (5,):
            verdict = "TLE"
            break
        if status_id in (6,):
            verdict = "CE"
            break
        if status_id in (7, 8, 9, 10, 11, 12, 14):
            verdict = "RE"
            break
        if status_id in (13,):
            verdict = "IE"
            break
        if not r.get("passed"):
            verdict = "WA"
    if total == 0:
        verdict = "NA"

    return {"passed": passed, "total": total, "verdict": verdict}
