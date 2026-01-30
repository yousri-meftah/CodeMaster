"""Add problem constraints and seed more test cases

Revision ID: a1f2c3d4e5f6
Revises: 9d7c1c1f4e3b
Create Date: 2026-01-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1f2c3d4e5f6"
down_revision: Union[str, None] = "9d7c1c1f4e3b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _seed_cases_sum_two_numbers() -> list[tuple[str, str, bool, int]]:
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


def _seed_cases_valid_parentheses() -> list[tuple[str, str, bool, int]]:
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


def upgrade() -> None:
    op.add_column("problems", sa.Column("constraints", sa.Text(), nullable=True))

    conn = op.get_bind()
    problems = conn.execute(sa.text("SELECT id, title, constraints FROM problems")).fetchall()
    for problem_id, title, constraints in problems:
        title_lower = (title or "").lower()
        if "sum of two numbers" in title_lower:
            if not constraints:
                conn.execute(
                    sa.text("UPDATE problems SET constraints = :constraints WHERE id = :id"),
                    {
                        "id": problem_id,
                        "constraints": "1 <= a, b <= 10^9",
                    },
                )
            existing = conn.execute(
                sa.text("SELECT COUNT(*) FROM problem_test_cases WHERE problem_id = :id"),
                {"id": problem_id},
            ).scalar() or 0
            if existing < 10:
                conn.execute(sa.text("DELETE FROM problem_test_cases WHERE problem_id = :id"), {"id": problem_id})
                for input_text, output_text, is_sample, order in _seed_cases_sum_two_numbers():
                    conn.execute(
                        sa.text(
                            """
                            INSERT INTO problem_test_cases (problem_id, input_text, output_text, is_sample, "order")
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
                    sa.text("UPDATE problems SET constraints = :constraints WHERE id = :id"),
                    {
                        "id": problem_id,
                        "constraints": "1 <= s.length <= 10^4; s consists of only ()[]{}",
                    },
                )
            existing = conn.execute(
                sa.text("SELECT COUNT(*) FROM problem_test_cases WHERE problem_id = :id"),
                {"id": problem_id},
            ).scalar() or 0
            if existing < 10:
                conn.execute(sa.text("DELETE FROM problem_test_cases WHERE problem_id = :id"), {"id": problem_id})
                for input_text, output_text, is_sample, order in _seed_cases_valid_parentheses():
                    conn.execute(
                        sa.text(
                            """
                            INSERT INTO problem_test_cases (problem_id, input_text, output_text, is_sample, "order")
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


def downgrade() -> None:
    op.drop_column("problems", "constraints")
