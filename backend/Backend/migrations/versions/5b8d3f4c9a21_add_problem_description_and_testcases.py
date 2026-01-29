"""Add problem description and test cases

Revision ID: 5b8d3f4c9a21
Revises: c34621808c8d
Create Date: 2026-01-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5b8d3f4c9a21"
down_revision: Union[str, None] = "c34621808c8d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("problems", sa.Column("description", sa.Text(), nullable=True))

    op.create_table(
        "problem_test_cases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("input_text", sa.Text(), nullable=False),
        sa.Column("output_text", sa.Text(), nullable=False),
        sa.Column("is_sample", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Seed two simple problems and their test cases if no problems exist yet.
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT COUNT(*) FROM problems"))
    count = result.scalar() or 0
    if count == 0:
        conn.execute(
            sa.text(
                """
                INSERT INTO problems (title, difficulty, external_link, description)
                VALUES
                (:title1, :difficulty1, NULL, :description1),
                (:title2, :difficulty2, NULL, :description2)
                """
            ),
            {
                "title1": "Sum of Two Numbers",
                "difficulty1": "easy",
                "description1": (
                    "Given two integers a and b, return their sum.\n\n"
                    "Input: Two space-separated integers a and b.\n"
                    "Output: The sum a + b."
                ),
                "title2": "Sum of Array",
                "difficulty2": "easy",
                "description2": (
                    "Given a list of integers, return the sum of all elements.\n\n"
                    "Input: A space-separated list of integers.\n"
                    "Output: The total sum."
                ),
            },
        )

        problem_rows = conn.execute(
            sa.text("SELECT id, title FROM problems ORDER BY id ASC LIMIT 2")
        ).fetchall()

        if len(problem_rows) >= 2:
            problem1_id = problem_rows[0][0]
            problem2_id = problem_rows[1][0]

            conn.execute(
                sa.text(
                    """
                    INSERT INTO problem_test_cases (problem_id, input_text, output_text, is_sample, "order")
                    VALUES
                    (:p1, '2 3', '5', true, 0),
                    (:p1, '10 20', '30', true, 1),
                    (:p1, '100 250', '350', false, 2),
                    (:p2, '1 2 3', '6', true, 0),
                    (:p2, '5 10 15 20', '50', true, 1),
                    (:p2, '7 7 7 7 7', '35', false, 2)
                    """
                ),
                {"p1": problem1_id, "p2": problem2_id},
            )


def downgrade() -> None:
    op.drop_table("problem_test_cases")
    op.drop_column("problems", "description")
