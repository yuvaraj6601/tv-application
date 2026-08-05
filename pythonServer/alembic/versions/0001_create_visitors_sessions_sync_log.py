"""create visitors, sessions, sync_log

Revision ID: 0001
Revises:
Create Date: 2026-08-05

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "visitors",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("pi_id", sa.String(length=17), nullable=False),
        sa.Column("face_embedding", sa.LargeBinary(), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("pi_id", "id"),
    )
    op.create_index("ix_visitors_pi_id", "visitors", ["pi_id"])

    op.create_table(
        "sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("pi_id", sa.String(length=17), nullable=False),
        sa.Column("visitor_id", sa.String(length=36), sa.ForeignKey("visitors.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("synced_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sessions_pi_id", "sessions", ["pi_id"])
    op.create_index("ix_sessions_visitor_id", "sessions", ["visitor_id"])
    op.create_index("ix_sessions_pi_id_started_at", "sessions", ["pi_id", "started_at"])

    op.create_table(
        "sync_log",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("pi_id", sa.String(length=17), nullable=False),
        sa.Column("sync_date", sa.Date(), nullable=False),
        sa.Column("rows_synced", sa.Integer(), nullable=False),
        sa.Column("synced_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("pi_id", "sync_date"),
    )


def downgrade() -> None:
    op.drop_table("sync_log")
    op.drop_table("sessions")
    op.drop_table("visitors")
