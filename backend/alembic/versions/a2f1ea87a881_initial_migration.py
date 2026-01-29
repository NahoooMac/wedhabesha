"""Initial migration

Revision ID: a2f1ea87a881
Revises: 
Create Date: 2026-01-20 00:13:42.026824

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a2f1ea87a881'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user table
    op.create_table('user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('firebase_uid', sa.String(), nullable=True),
        sa.Column('user_type', sa.Enum('couple', 'vendor', 'admin', name='usertype'), nullable=False),
        sa.Column('auth_provider', sa.Enum('google', 'email', name='authprovider'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_email'), 'user', ['email'], unique=True)
    op.create_index(op.f('ix_user_firebase_uid'), 'user', ['firebase_uid'], unique=True)

    # Create couple table
    op.create_table('couple',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('partner1_name', sa.String(), nullable=False),
        sa.Column('partner2_name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Create vendor table
    op.create_table('vendor',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('business_name', sa.String(), nullable=False),
        sa.Column('category', sa.Enum('venue', 'catering', 'photography', 'videography', 'music', 'flowers', 'decoration', 'transportation', 'makeup', 'dress', 'jewelry', 'invitations', 'other', name='vendorcategory'), nullable=False),
        sa.Column('location', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Create wedding table
    op.create_table('wedding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('couple_id', sa.Integer(), nullable=False),
        sa.Column('wedding_code', sa.String(), nullable=False),
        sa.Column('staff_pin', sa.String(), nullable=False),
        sa.Column('wedding_date', sa.Date(), nullable=False),
        sa.Column('venue_name', sa.String(), nullable=False),
        sa.Column('venue_address', sa.String(), nullable=False),
        sa.Column('expected_guests', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['couple_id'], ['couple.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wedding_wedding_code'), 'wedding', ['wedding_code'], unique=True)

    # Create budget table
    op.create_table('budget',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wedding_id', sa.Integer(), nullable=False),
        sa.Column('total_budget', sa.Numeric(), nullable=False),
        sa.Column('currency', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create guest table
    op.create_table('guest',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wedding_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('qr_code', sa.String(), nullable=False),
        sa.Column('table_number', sa.Integer(), nullable=True),
        sa.Column('dietary_restrictions', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_guest_qr_code'), 'guest', ['qr_code'], unique=True)

    # Create checkin_session table
    op.create_table('checkinsession',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wedding_id', sa.Integer(), nullable=False),
        sa.Column('session_token', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create vendor_lead table
    op.create_table('vendorlead',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('couple_id', sa.Integer(), nullable=False),
        sa.Column('message', sa.String(), nullable=False),
        sa.Column('budget_range', sa.String(), nullable=True),
        sa.Column('event_date', sa.Date(), nullable=True),
        sa.Column('status', sa.Enum('new', 'contacted', 'converted', 'closed', name='leadstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['couple_id'], ['couple.id'], ),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendor.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create budget_category table
    op.create_table('budgetcategory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('budget_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('allocated_amount', sa.Numeric(), nullable=False),
        sa.Column('spent_amount', sa.Numeric(), nullable=False),
        sa.ForeignKeyConstraint(['budget_id'], ['budget.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create checkin table
    op.create_table('checkin',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('guest_id', sa.Integer(), nullable=False),
        sa.Column('wedding_id', sa.Integer(), nullable=False),
        sa.Column('checked_in_at', sa.DateTime(), nullable=False),
        sa.Column('checked_in_by', sa.String(), nullable=False),
        sa.Column('method', sa.Enum('qr_scan', 'manual', name='checkinmethod'), nullable=False),
        sa.ForeignKeyConstraint(['guest_id'], ['guest.id'], ),
        sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create review table
    op.create_table('review',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('couple_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.String(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['couple_id'], ['couple.id'], ),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendor.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create expense table
    op.create_table('expense',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('budget_category_id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('receipt_url', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['budget_category_id'], ['budgetcategory.id'], ),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendor.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('expense')
    op.drop_table('review')
    op.drop_table('checkin')
    op.drop_table('budgetcategory')
    op.drop_table('vendorlead')
    op.drop_table('checkinsession')
    op.drop_index(op.f('ix_guest_qr_code'), table_name='guest')
    op.drop_table('guest')
    op.drop_table('budget')
    op.drop_index(op.f('ix_wedding_wedding_code'), table_name='wedding')
    op.drop_table('wedding')
    op.drop_table('vendor')
    op.drop_table('couple')
    op.drop_index(op.f('ix_user_firebase_uid'), table_name='user')
    op.drop_index(op.f('ix_user_email'), table_name='user')
    op.drop_table('user')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS checkinmethod')
    op.execute('DROP TYPE IF EXISTS leadstatus')
    op.execute('DROP TYPE IF EXISTS vendorcategory')
    op.execute('DROP TYPE IF EXISTS authprovider')
    op.execute('DROP TYPE IF EXISTS usertype')