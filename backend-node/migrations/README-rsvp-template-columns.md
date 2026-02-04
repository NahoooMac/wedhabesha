# RSVP Template Selection Migration

## Overview

This migration adds support for the RSVP template selection feature, allowing couples to choose and customize invitation templates for their wedding RSVP system.

## Files

- **add-rsvp-template-columns.js** - Main migration script (adds columns and index)
- **rollback-rsvp-template-columns.js** - Rollback script (removes columns and index)
- **README-rsvp-template-columns.md** - This documentation file

## Changes

### Database Schema

**Weddings Table - New Columns:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `template_id` | VARCHAR(50) | 'elegant-gold' | Selected template identifier |
| `template_customization` | TEXT/JSONB | NULL | JSON object with template customization settings |

**New Index:**
- `idx_weddings_template_id` on `weddings(template_id)` - For faster template lookups

### Template Customization Structure

The `template_customization` column stores a JSON object with the following structure:

```json
{
  "wedding_title": "string",
  "ceremony_date": "string",
  "ceremony_time": "string",
  "venue_name": "string",
  "venue_address": "string",
  "custom_message": "string",
  "text_y_position": "number (optional)",
  "qr_position": "string (optional: 'bottom-left' | 'bottom-center' | 'bottom-right')",
  "background_overlay": "number (optional)"
}
```

## Running the Migration

### Apply Migration

```bash
cd backend-node
node migrations/add-rsvp-template-columns.js
```

Expected output:
```
Running migration: add-rsvp-template-columns
✓ Added template_id column to weddings table with default "elegant-gold"
✓ Added template_customization column to weddings table
✓ Created index idx_weddings_template_id on weddings.template_id
✅ Migration completed successfully
```

### Rollback Migration

**⚠️ WARNING: This is a destructive operation that will permanently delete all template selection data!**

```bash
cd backend-node
node migrations/rollback-rsvp-template-columns.js
```

The rollback script will:
1. Wait 5 seconds (giving you time to cancel with Ctrl+C)
2. Remove the `idx_weddings_template_id` index
3. Remove the `template_id` and `template_customization` columns
4. For SQLite: Recreate the table without these columns (preserves other data)
5. For PostgreSQL: Use standard DROP COLUMN commands

## Verification

After running the migration, verify it was successful:

```bash
# For SQLite
sqlite3 wedding_platform.db "PRAGMA table_info(weddings);"

# Check for template_id and template_customization columns
# Check that existing weddings have template_id = 'elegant-gold'
sqlite3 wedding_platform.db "SELECT id, template_id FROM weddings LIMIT 5;"
```

## Requirements Satisfied

This migration satisfies the following requirements from the rsvp-template-selection spec:

- **Requirement 7.1**: Template ID storage in weddings table
- **Requirement 7.2**: Template customization storage as JSON in database

## Database Compatibility

- **SQLite**: Uses TEXT column for JSON storage (application handles serialization)
- **PostgreSQL**: Can use JSONB column for better performance (future enhancement)

## Notes

1. **Default Template**: All existing weddings automatically get `template_id = 'elegant-gold'`
2. **Null Customization**: New weddings start with `template_customization = NULL` until customized
3. **Index Performance**: The index on `template_id` improves query performance for template lookups
4. **SQLite Limitations**: SQLite doesn't support DROP COLUMN, so rollback requires table recreation
5. **Data Safety**: The rollback script creates a backup table before making changes

## Related Files

- Frontend: `frontend/src/components/wedding/WeddingConfiguration.tsx`
- Backend API: `backend-node/routes/invitations.js`
- Design Doc: `.kiro/specs/rsvp-template-selection/design.md`
- Requirements: `.kiro/specs/rsvp-template-selection/requirements.md`

## Support

For issues or questions about this migration, refer to:
- Task 1.1 in `.kiro/specs/rsvp-template-selection/tasks.md`
- Design document section "Database Schema Changes"
