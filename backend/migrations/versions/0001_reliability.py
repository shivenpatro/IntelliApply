"""Add integrity constraints and durable task state without deleting user data."""

import sqlalchemy as sa
from alembic import op

revision = "0001_reliability"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    from app.db.models import Base

    connection = op.get_bind()
    tables = set(sa.inspect(connection).get_table_names())
    # Refuse unsafe data reconciliation; operators receive counts, never PII.
    checks = {
        "users": "SELECT count(*) FROM users WHERE supabase_id IS NULL",
        "profiles": "SELECT count(*) FROM profiles p LEFT JOIN users u ON u.supabase_id=p.id WHERE u.id IS NULL OR p.min_salary < 0",
        "skills": "SELECT count(*) FROM (SELECT profile_id,lower(btrim(name)) FROM skills GROUP BY 1,2 HAVING count(*)>1 OR lower(btrim(name))='' OR profile_id IS NULL OR lower(btrim(name)) IS NULL) conflicts",
        "experiences": "SELECT count(*) FROM experiences WHERE profile_id IS NULL OR title IS NULL OR company IS NULL OR btrim(title)='' OR btrim(company)='' OR end_date < start_date",
        "user_job_matches": "SELECT count(*) FROM (SELECT user_id,job_id FROM user_job_matches GROUP BY 1,2 HAVING count(*)>1 UNION ALL SELECT user_id,job_id FROM user_job_matches WHERE user_id IS NULL OR job_id IS NULL OR relevance_score IS NULL OR status IS NULL OR relevance_score<0 OR relevance_score>1 OR status NOT IN ('pending','interested','applied','ignored')) conflicts",
    }
    for table, query in checks.items():
        if table in tables:
            count = connection.execute(sa.text(query)).scalar()
            if count:
                raise RuntimeError(
                    f"Migration preflight: {table} has {count} conflicting records/groups. Back up and reconcile before retrying; no data was deleted."
                )
    Base.metadata.create_all(connection)
    inspect = sa.inspect(connection)
    if "version" not in {c["name"] for c in inspect.get_columns("profiles")}:
        op.add_column(
            "profiles",
            sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        )
    if "is_current" not in {c["name"] for c in inspect.get_columns("user_job_matches")}:
        op.add_column(
            "user_job_matches",
            sa.Column(
                "is_current", sa.Boolean(), nullable=False, server_default=sa.true()
            ),
        )
    if not any(
        f["referred_table"] == "users" for f in inspect.get_foreign_keys("profiles")
    ):
        op.create_foreign_key(
            "fk_profile_user", "profiles", "users", ["id"], ["supabase_id"]
        )
    for table, name, expression in [
        ("profiles", "ck_profile_salary", "min_salary IS NULL OR min_salary >= 0"),
        ("skills", "ck_skill_nonempty", "length(btrim(name)) > 0"),
        (
            "experiences",
            "ck_experience_nonempty",
            "length(btrim(title)) > 0 AND length(btrim(company)) > 0",
        ),
        (
            "experiences",
            "ck_experience_dates",
            "end_date IS NULL OR start_date IS NULL OR end_date >= start_date",
        ),
        (
            "user_job_matches",
            "ck_match_score",
            "relevance_score >= 0 AND relevance_score <= 1",
        ),
        (
            "user_job_matches",
            "ck_match_status",
            "status IN ('pending','interested','applied','ignored')",
        ),
    ]:
        if name not in {
            c["name"] for c in sa.inspect(connection).get_check_constraints(table)
        }:
            op.create_check_constraint(name, table, expression)
    if "uq_user_job_match" not in {
        c["name"]
        for c in sa.inspect(connection).get_unique_constraints("user_job_matches")
    }:
        op.create_unique_constraint(
            "uq_user_job_match", "user_job_matches", ["user_id", "job_id"]
        )
    for table, column in [
        ("users", "supabase_id"),
        ("skills", "profile_id"),
        ("skills", "name"),
        ("experiences", "profile_id"),
        ("experiences", "title"),
        ("experiences", "company"),
        ("user_job_matches", "user_id"),
        ("user_job_matches", "job_id"),
        ("user_job_matches", "relevance_score"),
        ("user_job_matches", "status"),
    ]:
        op.alter_column(table, column, nullable=False)
    connection.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_profile_name ON skills (profile_id,lower(btrim(name)))"
        )
    )


def downgrade():
    # Task/status/history data must not disappear as a side effect of rollback.
    raise RuntimeError(
        "Use the previous application with this additive schema, or restore the verified pre-migration backup. Automatic destructive downgrade is disabled."
    )
