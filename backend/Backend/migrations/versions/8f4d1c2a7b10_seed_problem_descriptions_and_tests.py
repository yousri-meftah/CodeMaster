"""Seed problem descriptions and test cases

Revision ID: 8f4d1c2a7b10
Revises: 5b8d3f4c9a21
Create Date: 2026-01-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8f4d1c2a7b10"
down_revision: Union[str, None] = "5b8d3f4c9a21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Add description/test cases for existing "Valid Parentheses" if present.
    vp_row = conn.execute(
        sa.text("SELECT id, description FROM problems WHERE title = :title LIMIT 1"),
        {"title": "Valid Parentheses"},
    ).fetchone()

    if vp_row:
        problem_id = vp_row[0]
        description = vp_row[1]
        if not description:
            conn.execute(
                sa.text("UPDATE problems SET description = :description WHERE id = :id"),
                {
                    "id": problem_id,
                    "description": (
                        "Given a string s containing only the characters '(', ')', '{', '}', '[' and ']', "
                        "determine if the input string is valid.\n\n"
                        "An input string is valid if:\n"
                        "1) Open brackets are closed by the same type of brackets.\n"
                        "2) Open brackets are closed in the correct order.\n\n"
                        "Input: A string s\n"
                        "Output: true if valid, otherwise false"
                    ),
                },
            )

        existing_tc = conn.execute(
            sa.text("SELECT COUNT(*) FROM problem_test_cases WHERE problem_id = :id"),
            {"id": problem_id},
        ).scalar() or 0
        if existing_tc == 0:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO problem_test_cases (problem_id, input_text, output_text, is_sample, "order")
                    VALUES
                    (:pid, '()[]{}', 'true', true, 0),
                    (:pid, '(]', 'false', true, 1),
                    (:pid, '([{}])', 'true', false, 2)
                    """
                ),
                {"pid": problem_id},
            )

    # Insert a simple "Sum of Two Numbers" problem if it doesn't exist.
    sum_row = conn.execute(
        sa.text("SELECT id FROM problems WHERE title = :title LIMIT 1"),
        {"title": "Sum of Two Numbers"},
    ).fetchone()

    if not sum_row:
        conn.execute(
            sa.text(
                """
                INSERT INTO problems (title, difficulty, external_link, description)
                VALUES (:title, :difficulty, NULL, :description)
                """
            ),
            {
                "title": "Sum of Two Numbers",
                "difficulty": "easy",
                "description": (
                    "Given two integers a and b, return their sum.\n\n"
                    "Input: Two space-separated integers a and b.\n"
                    "Output: The sum a + b."
                ),
            },
        )

        new_id = conn.execute(
            sa.text("SELECT id FROM problems WHERE title = :title LIMIT 1"),
            {"title": "Sum of Two Numbers"},
        ).scalar()

        if new_id:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO problem_test_cases (problem_id, input_text, output_text, is_sample, "order")
                    VALUES
                    (:pid, '2 3', '5', true, 0),
                    (:pid, '10 20', '30', true, 1),
                    (:pid, '100 250', '350', false, 2)
                    """
                ),
                {"pid": new_id},
            )


def downgrade() -> None:
    # Downgrade does not remove seeded data to avoid accidental data loss.
    pass
