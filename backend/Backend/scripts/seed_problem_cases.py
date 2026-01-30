import os
import sys
from sqlalchemy import create_engine, text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.config import settings


def seed_cases_sum_two_numbers():
    return [
        ("1 1", "2", True, 0),
        ("2 3", "5", True, 1),
        ("10 20", "30", True, 2),
        ("-5 7", "2", False, 3),
        ("100 250", "350", False, 4),
        ("0 0", "0", False, 5),
        ("999999 1", "1000000", False, 6),
        ("-100 -200", "-300", False, 7),
        ("12345 67890", "80235", False, 8),
        ("42 -42", "0", False, 9),
    ]


def seed_cases_valid_parentheses():
    return [
        ("()", "true", True, 0),
        ("()[]{}", "true", True, 1),
        ("(]", "false", True, 2),
        ("([{}])", "true", False, 3),
        ("([)]", "false", False, 4),
        ("{[()]}", "true", False, 5),
        ("(", "false", False, 6),
        ("", "true", False, 7),
        ("([]{})", "true", False, 8),
        ("]", "false", False, 9),
    ]


def main():
    engine = create_engine(settings.POSTGRES_URL)
    with engine.begin() as conn:
        rows = conn.execute(text("SELECT id, title, constraints FROM problems")).fetchall()
        for problem_id, title, constraints in rows:
            title_lower = (title or "").lower()
            if "sum of two numbers" in title_lower:
                if not constraints:
                    conn.execute(
                        text("UPDATE problems SET constraints = :constraints WHERE id = :id"),
                        {"id": problem_id, "constraints": "1 <= a, b <= 10^9"},
                    )
                conn.execute(text("DELETE FROM problem_test_cases WHERE problem_id = :id"), {"id": problem_id})
                for input_text, output_text, is_sample, order in seed_cases_sum_two_numbers():
                    conn.execute(
                        text(
                            """
                            INSERT INTO problem_test_cases (problem_id, input_text, output_text, is_sample, \"order\")
                            VALUES (:pid, :input, :output, :is_sample, :order)
                            """
                        ),
                        {
                            "pid": problem_id,
                            "input": input_text,
                            "output": output_text,
                            "is_sample": is_sample,
                            "order": order,
                        },
                    )
            if "valid parentheses" in title_lower:
                if not constraints:
                    conn.execute(
                        text("UPDATE problems SET constraints = :constraints WHERE id = :id"),
                        {"id": problem_id, "constraints": "1 <= s.length <= 10^4; s consists of only ()[]{}"},
                    )
                conn.execute(text("DELETE FROM problem_test_cases WHERE problem_id = :id"), {"id": problem_id})
                for input_text, output_text, is_sample, order in seed_cases_valid_parentheses():
                    conn.execute(
                        text(
                            """
                            INSERT INTO problem_test_cases (problem_id, input_text, output_text, is_sample, \"order\")
                            VALUES (:pid, :input, :output, :is_sample, :order)
                            """
                        ),
                        {
                            "pid": problem_id,
                            "input": input_text,
                            "output": output_text,
                            "is_sample": is_sample,
                            "order": order,
                        },
                    )


if __name__ == "__main__":
    main()
