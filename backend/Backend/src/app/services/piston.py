import time
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
    lang = _normalize(language)
    if _RUNTIME_CACHE and (now - _RUNTIME_CACHE_TS) < _RUNTIME_CACHE_TTL_SECONDS:
        version = _RUNTIME_CACHE.get(lang)
        if version:
            return lang, version

    runtimes = _fetch_runtimes()
    _RUNTIME_CACHE.clear()
    for rt in runtimes:
        lang = _normalize(rt.get("language"))
        version = rt.get("version")
        if lang and version and lang not in _RUNTIME_CACHE:
            _RUNTIME_CACHE[lang] = version
        for alias in rt.get("aliases") or []:
            alias_norm = _normalize(alias)
            if alias_norm and version and alias_norm not in _RUNTIME_CACHE:
                _RUNTIME_CACHE[alias_norm] = version
    _RUNTIME_CACHE_TS = now

    # Try exact/alias match first, then known synonyms for our UI languages
    picked = _pick_runtime(runtimes, lang)
    if not picked:
        synonyms = {
            "javascript": ["javascript", "js", "node", "nodejs"],
            "python": ["python", "py"],
            "java": ["java"],
            "cpp": ["cpp", "c++", "cxx"],
        }
        for alt in synonyms.get(lang, []):
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


def execute_piston(
    language: str,
    source_code: str,
    stdin: str,
) -> Dict:
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
    results: List[Dict] = []
    for tc in test_cases:
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

        results.append(
            {
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
        )

    return results


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
