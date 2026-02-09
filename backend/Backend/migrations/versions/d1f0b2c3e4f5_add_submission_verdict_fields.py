"""Add submission verdict fields

Revision ID: d1f0b2c3e4f5
Revises: c3d4e5f6a7b8
Create Date: 2026-02-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1f0b2c3e4f5"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("submissions", sa.Column("verdict", sa.String(), nullable=True))
    op.add_column("submissions", sa.Column("passed", sa.Integer(), nullable=True))
    op.add_column("submissions", sa.Column("total", sa.Integer(), nullable=True))
    op.add_column("submissions", sa.Column("runtime_ms", sa.Integer(), nullable=True))
    op.add_column("submissions", sa.Column("memory_kb", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("submissions", "memory_kb")
    op.drop_column("submissions", "runtime_ms")
    op.drop_column("submissions", "total")
    op.drop_column("submissions", "passed")
    op.drop_column("submissions", "verdict")
