"""Add interview submission change summary

Revision ID: f9a0b1c2d3e4
Revises: f2a3b4c5d6e7
Create Date: 2026-03-23 00:00:01.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f9a0b1c2d3e4"
down_revision: Union[str, None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "interview_submissions",
        sa.Column("change_summary", sa.JSON(), nullable=True),
    )
    op.add_column(
        "interview_submissions",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_column("interview_submissions", "updated_at")
    op.drop_column("interview_submissions", "change_summary")
