"""Add admin system and moderation fields

Revision ID: b3f2ea87a882
Revises: a2f1ea87a881
Create Date: 2026-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b3f2ea87a882'
down_revision = 'a2f1ea87a881'
branch_labels = None
depends_on = None


def upgrade():
    # Add last_login field to user table
    op.add_column('user', sa.Column('last_login', sa.DateTime(), nullable=True))
    
    # Add moderation fields to review table
    op.add_column('review', sa.Column('is_flagged', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('review', sa.Column('is_hidden', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create vendor application table
    op.create_table('vendorapplication',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', name='vendorapplicationstatus'), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('rejection_reason', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['reviewed_by'], ['user.id'], ),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendor.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('vendor_id')
    )
    
    # Create vendor subscription table
    op.create_table('vendorsubscription',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('tier', sa.Enum('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE', name='vendorsubscriptiontier'), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendor.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('vendor_id')
    )
    
    # Create audit log table
    op.create_table('auditlog',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('admin_user_id', sa.Integer(), nullable=False),
        sa.Column('action_type', sa.Enum('VENDOR_APPROVAL', 'VENDOR_REJECTION', 'REVIEW_MODERATION', 'USER_SUSPENSION', 'USER_ACTIVATION', 'SUBSCRIPTION_CHANGE', 'CONTENT_MODERATION', name='adminactiontype'), nullable=False),
        sa.Column('target_type', sa.String(), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('action_metadata', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['admin_user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create platform metrics table
    op.create_table('platformmetrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('total_users', sa.Integer(), nullable=False),
        sa.Column('total_couples', sa.Integer(), nullable=False),
        sa.Column('total_vendors', sa.Integer(), nullable=False),
        sa.Column('total_weddings', sa.Integer(), nullable=False),
        sa.Column('total_checkins', sa.Integer(), nullable=False),
        sa.Column('total_reviews', sa.Integer(), nullable=False),
        sa.Column('total_leads', sa.Integer(), nullable=False),
        sa.Column('active_users_30d', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    # Drop tables
    op.drop_table('platformmetrics')
    op.drop_table('auditlog')
    op.drop_table('vendorsubscription')
    op.drop_table('vendorapplication')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS adminactiontype')
    op.execute('DROP TYPE IF EXISTS vendorsubscriptiontier')
    op.execute('DROP TYPE IF EXISTS vendorapplicationstatus')
    
    # Remove columns from review table
    op.drop_column('review', 'is_hidden')
    op.drop_column('review', 'is_flagged')
    
    # Remove column from user table
    op.drop_column('user', 'last_login')