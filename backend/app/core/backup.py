"""
Backup and Recovery System

Automated database backups with S3 storage and recovery procedures.
"""

import asyncio
import subprocess
import gzip
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class BackupManager:
    """Database backup and recovery manager"""
    
    def __init__(self):
        self.backup_dir = Path("/var/backups/wedding-platform")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize S3 client if configured
        self.s3_client = None
        if all([settings.BACKUP_S3_BUCKET, settings.BACKUP_S3_ACCESS_KEY, settings.BACKUP_S3_SECRET_KEY]):
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.BACKUP_S3_ACCESS_KEY,
                    aws_secret_access_key=settings.BACKUP_S3_SECRET_KEY
                )
                logger.info("S3 backup client initialized")
            except NoCredentialsError:
                logger.warning("S3 credentials not available, local backups only")
    
    async def create_backup(self, backup_type: str = "full") -> Dict[str, Any]:
        """Create a database backup"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"wedding_platform_{backup_type}_{timestamp}.sql"
        backup_path = self.backup_dir / backup_filename
        compressed_path = self.backup_dir / f"{backup_filename}.gz"
        
        try:
            logger.info(f"Starting {backup_type} backup: {backup_filename}")
            
            # Create database dump
            await self._create_database_dump(backup_path, backup_type)
            
            # Compress backup
            await self._compress_backup(backup_path, compressed_path)
            
            # Remove uncompressed file
            backup_path.unlink()
            
            # Get backup info
            backup_info = {
                "filename": compressed_path.name,
                "path": str(compressed_path),
                "size": compressed_path.stat().st_size,
                "type": backup_type,
                "timestamp": timestamp,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Upload to S3 if configured
            if self.s3_client:
                s3_key = await self._upload_to_s3(compressed_path, backup_info)
                backup_info["s3_key"] = s3_key
            
            logger.info(f"Backup completed: {backup_filename}")
            return backup_info
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            # Clean up partial files
            if backup_path.exists():
                backup_path.unlink()
            if compressed_path.exists():
                compressed_path.unlink()
            raise
    
    async def _create_database_dump(self, backup_path: Path, backup_type: str):
        """Create PostgreSQL database dump"""
        # Parse database URL
        db_url = settings.DATABASE_URL
        if not db_url.startswith("postgresql://"):
            raise ValueError("Invalid database URL format")
        
        # Extract connection details
        # Format: postgresql://user:password@host:port/database
        url_parts = db_url.replace("postgresql://", "").split("/")
        db_name = url_parts[1]
        user_host_port = url_parts[0].split("@")
        user_pass = user_host_port[0].split(":")
        host_port = user_host_port[1].split(":")
        
        username = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ""
        host = host_port[0]
        port = host_port[1] if len(host_port) > 1 else "5432"
        
        # Build pg_dump command
        cmd = [
            "pg_dump",
            f"--host={host}",
            f"--port={port}",
            f"--username={username}",
            f"--dbname={db_name}",
            "--no-password",
            "--verbose",
            "--clean",
            "--if-exists",
            "--create",
            f"--file={backup_path}"
        ]
        
        # Add backup type specific options
        if backup_type == "schema":
            cmd.append("--schema-only")
        elif backup_type == "data":
            cmd.append("--data-only")
        # full backup doesn't need additional flags
        
        # Set environment variables
        env = {"PGPASSWORD": password}
        
        # Run pg_dump
        process = await asyncio.create_subprocess_exec(
            *cmd,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            raise RuntimeError(f"pg_dump failed: {error_msg}")
        
        logger.info(f"Database dump created: {backup_path}")
    
    async def _compress_backup(self, source_path: Path, target_path: Path):
        """Compress backup file with gzip"""
        def compress_file():
            with open(source_path, 'rb') as f_in:
                with gzip.open(target_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        
        # Run compression in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, compress_file)
        
        logger.info(f"Backup compressed: {target_path}")
    
    async def _upload_to_s3(self, backup_path: Path, backup_info: Dict[str, Any]) -> str:
        """Upload backup to S3"""
        if not self.s3_client:
            return None
        
        s3_key = f"backups/{backup_info['timestamp']}/{backup_path.name}"
        
        try:
            # Upload file
            self.s3_client.upload_file(
                str(backup_path),
                settings.BACKUP_S3_BUCKET,
                s3_key,
                ExtraArgs={
                    'Metadata': {
                        'backup-type': backup_info['type'],
                        'created-at': backup_info['created_at'],
                        'size': str(backup_info['size'])
                    }
                }
            )
            
            logger.info(f"Backup uploaded to S3: s3://{settings.BACKUP_S3_BUCKET}/{s3_key}")
            return s3_key
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            raise
    
    async def list_backups(self, include_s3: bool = True) -> List[Dict[str, Any]]:
        """List available backups"""
        backups = []
        
        # List local backups
        for backup_file in self.backup_dir.glob("*.sql.gz"):
            stat = backup_file.stat()
            backups.append({
                "filename": backup_file.name,
                "path": str(backup_file),
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "location": "local"
            })
        
        # List S3 backups if configured
        if include_s3 and self.s3_client:
            try:
                response = self.s3_client.list_objects_v2(
                    Bucket=settings.BACKUP_S3_BUCKET,
                    Prefix="backups/"
                )
                
                for obj in response.get('Contents', []):
                    backups.append({
                        "filename": obj['Key'].split('/')[-1],
                        "s3_key": obj['Key'],
                        "size": obj['Size'],
                        "created_at": obj['LastModified'].isoformat(),
                        "location": "s3"
                    })
            except ClientError as e:
                logger.error(f"Failed to list S3 backups: {e}")
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        return backups
    
    async def restore_backup(self, backup_identifier: str, 
                           restore_type: str = "full") -> Dict[str, Any]:
        """Restore from backup"""
        logger.info(f"Starting restore from backup: {backup_identifier}")
        
        try:
            # Find backup file
            backup_path = await self._get_backup_file(backup_identifier)
            
            # Decompress if needed
            if backup_path.suffix == '.gz':
                decompressed_path = backup_path.with_suffix('')
                await self._decompress_backup(backup_path, decompressed_path)
                backup_path = decompressed_path
            
            # Restore database
            await self._restore_database(backup_path, restore_type)
            
            # Clean up decompressed file
            if backup_path.suffix == '.sql':
                backup_path.unlink()
            
            logger.info(f"Restore completed: {backup_identifier}")
            return {
                "status": "success",
                "backup_identifier": backup_identifier,
                "restore_type": restore_type,
                "restored_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise
    
    async def _get_backup_file(self, backup_identifier: str) -> Path:
        """Get backup file (download from S3 if needed)"""
        # Check if it's a local file
        local_path = self.backup_dir / backup_identifier
        if local_path.exists():
            return local_path
        
        # Check if it's an S3 key
        if self.s3_client and backup_identifier.startswith("backups/"):
            download_path = self.backup_dir / backup_identifier.split('/')[-1]
            
            try:
                self.s3_client.download_file(
                    settings.BACKUP_S3_BUCKET,
                    backup_identifier,
                    str(download_path)
                )
                logger.info(f"Downloaded backup from S3: {backup_identifier}")
                return download_path
            except ClientError as e:
                logger.error(f"Failed to download backup from S3: {e}")
                raise
        
        raise FileNotFoundError(f"Backup not found: {backup_identifier}")
    
    async def _decompress_backup(self, compressed_path: Path, target_path: Path):
        """Decompress gzipped backup"""
        def decompress_file():
            with gzip.open(compressed_path, 'rb') as f_in:
                with open(target_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, decompress_file)
        
        logger.info(f"Backup decompressed: {target_path}")
    
    async def _restore_database(self, backup_path: Path, restore_type: str):
        """Restore database from SQL dump"""
        # Parse database URL (same as in _create_database_dump)
        db_url = settings.DATABASE_URL
        url_parts = db_url.replace("postgresql://", "").split("/")
        db_name = url_parts[1]
        user_host_port = url_parts[0].split("@")
        user_pass = user_host_port[0].split(":")
        host_port = user_host_port[1].split(":")
        
        username = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ""
        host = host_port[0]
        port = host_port[1] if len(host_port) > 1 else "5432"
        
        # Build psql command
        cmd = [
            "psql",
            f"--host={host}",
            f"--port={port}",
            f"--username={username}",
            f"--dbname={db_name}",
            "--no-password",
            "--verbose",
            f"--file={backup_path}"
        ]
        
        # Set environment variables
        env = {"PGPASSWORD": password}
        
        # Run psql
        process = await asyncio.create_subprocess_exec(
            *cmd,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            raise RuntimeError(f"Database restore failed: {error_msg}")
        
        logger.info(f"Database restored from: {backup_path}")
    
    async def cleanup_old_backups(self):
        """Clean up old backups based on retention policy"""
        cutoff_date = datetime.utcnow() - timedelta(days=settings.BACKUP_RETENTION_DAYS)
        
        # Clean up local backups
        deleted_local = 0
        for backup_file in self.backup_dir.glob("*.sql.gz"):
            file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
            if file_time < cutoff_date:
                backup_file.unlink()
                deleted_local += 1
                logger.info(f"Deleted old local backup: {backup_file.name}")
        
        # Clean up S3 backups
        deleted_s3 = 0
        if self.s3_client:
            try:
                response = self.s3_client.list_objects_v2(
                    Bucket=settings.BACKUP_S3_BUCKET,
                    Prefix="backups/"
                )
                
                for obj in response.get('Contents', []):
                    if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                        self.s3_client.delete_object(
                            Bucket=settings.BACKUP_S3_BUCKET,
                            Key=obj['Key']
                        )
                        deleted_s3 += 1
                        logger.info(f"Deleted old S3 backup: {obj['Key']}")
                        
            except ClientError as e:
                logger.error(f"Failed to cleanup S3 backups: {e}")
        
        logger.info(f"Backup cleanup completed: {deleted_local} local, {deleted_s3} S3")
        return {"deleted_local": deleted_local, "deleted_s3": deleted_s3}


# Global backup manager instance
backup_manager = BackupManager()


async def scheduled_backup():
    """Run scheduled backup"""
    if not settings.BACKUP_ENABLED:
        return
    
    try:
        backup_info = await backup_manager.create_backup("full")
        logger.info(f"Scheduled backup completed: {backup_info['filename']}")
        
        # Cleanup old backups
        await backup_manager.cleanup_old_backups()
        
    except Exception as e:
        logger.error(f"Scheduled backup failed: {e}")


async def emergency_backup():
    """Create emergency backup before critical operations"""
    try:
        backup_info = await backup_manager.create_backup("full")
        logger.info(f"Emergency backup created: {backup_info['filename']}")
        return backup_info
    except Exception as e:
        logger.error(f"Emergency backup failed: {e}")
        raise