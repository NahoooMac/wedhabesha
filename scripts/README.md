# Wedding Platform Deployment Scripts

This directory contains scripts for deploying, managing, and monitoring the Wedding Platform in production environments.

## Scripts Overview

### 1. `deploy.sh` - Main Deployment Script
Automates the complete deployment process including health checks, backups, and rollbacks.

**Usage:**
```bash
./scripts/deploy.sh [command]
```

**Commands:**
- `deploy` - Full deployment (default)
- `rollback` - Rollback to previous version
- `status` - Show deployment status
- `backup` - Create backup only
- `health` - Run health checks only
- `cleanup` - Clean up Docker resources

**Examples:**
```bash
# Full deployment
./scripts/deploy.sh deploy

# Check deployment status
./scripts/deploy.sh status

# Rollback if issues occur
./scripts/deploy.sh rollback
```

### 2. `migrate.sh` - Database Migration Management
Handles database schema migrations and seeding.

**Usage:**
```bash
./scripts/migrate.sh [command] [options]
```

**Commands:**
- `migrate` - Run all pending migrations
- `create <message>` - Create new migration
- `history` - Show migration history
- `current` - Show current revision
- `rollback [revision]` - Rollback to revision
- `seed` - Seed database with initial data
- `reset` - Reset database (development only)
- `validate` - Validate database schema

**Examples:**
```bash
# Run migrations
./scripts/migrate.sh migrate

# Create new migration
./scripts/migrate.sh create "Add user preferences table"

# Rollback one migration
./scripts/migrate.sh rollback

# Seed database
./scripts/migrate.sh seed
```

### 3. `backup.sh` - Backup and Recovery Management
Manages database backups with local and S3 storage support.

**Usage:**
```bash
./scripts/backup.sh [command] [options]
```

**Commands:**
- `create [type]` - Create backup (full|schema|data)
- `list [include_s3]` - List available backups
- `restore <backup> [type]` - Restore from backup
- `cleanup [days]` - Clean up old backups
- `schedule [cron] [type]` - Schedule automatic backups
- `unschedule` - Remove backup schedule
- `test` - Test backup and restore
- `monitor` - Monitor backup status

**Examples:**
```bash
# Create full backup
./scripts/backup.sh create full

# List all backups
./scripts/backup.sh list

# Restore from specific backup
./scripts/backup.sh restore backup_20240121_120000.sql.gz

# Schedule daily backups at 2 AM
./scripts/backup.sh schedule "0 2 * * *" full

# Clean up backups older than 7 days
./scripts/backup.sh cleanup 7
```

### 4. `monitor.sh` - System Monitoring and Alerting
Provides comprehensive monitoring and alerting capabilities.

**Usage:**
```bash
./scripts/monitor.sh [command] [options]
```

**Commands:**
- `health` - Check system health
- `resources` - Monitor system resources
- `metrics` - Show application metrics
- `logs [service] [lines]` - Monitor logs
- `errors [hours]` - Check for errors in logs
- `performance` - Monitor performance metrics
- `continuous [interval]` - Start continuous monitoring
- `report [output_file]` - Generate monitoring report
- `setup-alerts` - Setup automated monitoring
- `remove-alerts` - Remove automated monitoring
- `alert <message> [severity]` - Send test alert

**Examples:**
```bash
# Check system health
./scripts/monitor.sh health

# Monitor backend logs
./scripts/monitor.sh logs backend 100

# Start continuous monitoring (5-minute intervals)
./scripts/monitor.sh continuous 300

# Generate monitoring report
./scripts/monitor.sh report /tmp/report.txt

# Setup automated monitoring service
./scripts/monitor.sh setup-alerts
```

## Prerequisites

### System Requirements
- Ubuntu 20.04 LTS or later
- Docker Engine 20.10+
- Docker Compose 2.0+
- Bash 4.0+
- curl
- PostgreSQL client tools (for backups)

### Permissions
Scripts should be run as a non-root user with Docker group membership:
```bash
sudo usermod -aG docker $USER
```

### Environment Setup
Ensure environment files are configured:
- `backend/.env` - Backend configuration
- `frontend/.env` - Frontend configuration

## Quick Start

### 1. Initial Deployment
```bash
# Clone repository
git clone https://github.com/your-org/wedding-platform.git
cd wedding-platform

# Configure environment
cp backend/.env.production backend/.env
cp frontend/.env.production frontend/.env
# Edit .env files with your values

# Make scripts executable (Linux/Mac)
chmod +x scripts/*.sh

# Deploy
./scripts/deploy.sh deploy
```

### 2. Setup Monitoring
```bash
# Setup automated monitoring
./scripts/monitor.sh setup-alerts

# Check monitoring status
sudo systemctl status wedding-platform-monitor
```

### 3. Schedule Backups
```bash
# Schedule daily backups
./scripts/backup.sh schedule "0 2 * * *" full

# Verify cron job
crontab -l
```

## Configuration

### Environment Variables

#### Deployment Configuration
- `ENVIRONMENT` - Environment name (production, staging)
- `DEBUG` - Debug mode (false for production)
- `SECRET_KEY` - Application secret key

#### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_POOL_SIZE` - Connection pool size
- `DATABASE_MAX_OVERFLOW` - Max overflow connections

#### Backup Configuration
- `BACKUP_ENABLED` - Enable automated backups
- `BACKUP_S3_BUCKET` - S3 bucket for backups
- `BACKUP_S3_ACCESS_KEY` - S3 access key
- `BACKUP_S3_SECRET_KEY` - S3 secret key
- `BACKUP_RETENTION_DAYS` - Backup retention period

#### Monitoring Configuration
- `SLACK_WEBHOOK_URL` - Slack webhook for alerts
- `ALERT_EMAIL` - Email address for alerts
- `HEALTH_CHECK_INTERVAL` - Health check interval (seconds)

### Docker Compose Files
- `docker-compose.yml` - Development configuration
- `docker-compose.production.yml` - Production configuration

## Security Considerations

### File Permissions
```bash
# Set secure permissions for scripts
chmod 750 scripts/*.sh

# Protect environment files
chmod 600 backend/.env frontend/.env

# Secure backup directory
chmod 700 /var/backups/wedding-platform
```

### SSL/TLS Configuration
Ensure SSL certificates are properly configured:
```bash
# Certificate files should be in ssl/ directory
ssl/wedhabesha.com.crt
ssl/wedhabesha.com.key

# Set secure permissions
chmod 600 ssl/*
```

### Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Troubleshooting

### Common Issues

#### 1. Permission Denied
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Check Docker group membership
groups $USER | grep docker
```

#### 2. Database Connection Issues
```bash
# Check database status
./scripts/monitor.sh health

# View database logs
./scripts/monitor.sh logs postgres 50
```

#### 3. Service Not Starting
```bash
# Check service status
./scripts/deploy.sh status

# View all logs
./scripts/monitor.sh logs all 100
```

#### 4. Backup Failures
```bash
# Test backup functionality
./scripts/backup.sh test

# Check backup permissions
ls -la /var/backups/wedding-platform/
```

### Log Locations
- Application logs: `/var/log/wedding-platform/`
- Deployment logs: `/var/log/wedding-platform/deploy.log`
- Backup logs: `/var/log/wedding-platform/backup.log`
- Alert logs: `/var/log/wedding-platform/alerts.log`

### Getting Help
```bash
# Show help for any script
./scripts/deploy.sh help
./scripts/migrate.sh help
./scripts/backup.sh help
./scripts/monitor.sh help
```

## Best Practices

### 1. Pre-deployment Checklist
- [ ] Environment files configured
- [ ] SSL certificates installed
- [ ] Database credentials verified
- [ ] External service credentials tested
- [ ] Backup storage configured
- [ ] Monitoring alerts configured

### 2. Deployment Process
1. Create backup before deployment
2. Run health checks
3. Deploy new version
4. Verify deployment
5. Monitor for issues
6. Rollback if necessary

### 3. Monitoring
- Setup automated monitoring service
- Configure alert notifications
- Regular health checks
- Monitor resource usage
- Review error logs daily

### 4. Backup Strategy
- Schedule daily full backups
- Test restore procedures monthly
- Monitor backup storage usage
- Verify backup integrity
- Document recovery procedures

### 5. Security
- Regular security updates
- Monitor access logs
- Rotate secrets periodically
- Use strong passwords
- Enable firewall protection

## Support

For additional support:
- Check the main [DEPLOYMENT.md](../DEPLOYMENT.md) guide
- Review application logs
- Contact the development team
- Create GitHub issues for bugs

## Contributing

When adding new scripts:
1. Follow existing naming conventions
2. Include comprehensive help text
3. Add error handling and logging
4. Test in staging environment
5. Update this documentation