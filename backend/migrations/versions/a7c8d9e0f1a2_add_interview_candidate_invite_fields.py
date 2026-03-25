"""add interview candidate invite fields

Revision ID: a7c8d9e0f1a2
Revises: f9a0b1c2d3e4
Create Date: 2026-03-24 22:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7c8d9e0f1a2"
down_revision: Union[str, None] = "f9a0b1c2d3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "interview_candidates",
        sa.Column("invite_status", sa.String(length=32), nullable=False, server_default="pending"),
    )
    op.add_column(
        "interview_candidates",
        sa.Column("invite_error", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "interview_candidates",
        sa.Column("invite_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "interview_candidates",
        sa.Column("invite_attempts", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("interview_candidates", "invite_attempts")
    op.drop_column("interview_candidates", "invite_sent_at")
    op.drop_column("interview_candidates", "invite_error")
    op.drop_column("interview_candidates", "invite_status")
