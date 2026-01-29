"""
Database Query Optimization

Performance optimization utilities for database queries.
"""

import time
import asyncio
from typing import Any, Dict, List, Optional, Callable
from functools import wraps
from contextlib import asynccontextmanager
from sqlalchemy import text, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings


class QueryPerformanceMonitor:
    """Monitor and log slow database queries"""
    
    def __init__(self, slow_query_threshold: float = 1.0):
        self.slow_query_threshold = slow_query_threshold
        self.query_stats: Dict[str, Dict[str, Any]] = {}
        self.slow_queries: List[Dict[str, Any]] = []
    
    def log_query(self, query: str, duration: float, params: Dict = None):
        """Log query execution time"""
        query_hash = hash(query)
        
        # Update statistics
        if query_hash not in self.query_stats:
            self.query_stats[query_hash] = {
                "query": query[:200] + "..." if len(query) > 200 else query,
                "count": 0,
                "total_time": 0,
                "avg_time": 0,
                "max_time": 0,
                "min_time": float('inf')
            }
        
        stats = self.query_stats[query_hash]
        stats["count"] += 1
        stats["total_time"] += duration
        stats["avg_time"] = stats["total_time"] / stats["count"]
        stats["max_time"] = max(stats["max_time"], duration)
        stats["min_time"] = min(stats["min_time"], duration)
        
        # Log slow queries
        if duration > self.slow_query_threshold:
            self.slow_queries.append({
                "query": query,
                "duration": duration,
                "params": params,
                "timestamp": time.time()
            })
            
            # Keep only last 100 slow queries
            if len(self.slow_queries) > 100:
                self.slow_queries = self.slow_queries[-100:]
            
            print(f"SLOW QUERY ({duration:.3f}s): {query[:100]}...")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get query performance statistics"""
        total_queries = sum(stats["count"] for stats in self.query_stats.values())
        total_time = sum(stats["total_time"] for stats in self.query_stats.values())
        
        return {
            "total_queries": total_queries,
            "total_time": total_time,
            "avg_query_time": total_time / total_queries if total_queries > 0 else 0,
            "slow_queries_count": len(self.slow_queries),
            "unique_queries": len(self.query_stats),
            "slowest_queries": sorted(
                self.query_stats.values(),
                key=lambda x: x["max_time"],
                reverse=True
            )[:10]
        }


# Global query monitor
query_monitor = QueryPerformanceMonitor()


# SQLAlchemy event listeners for query monitoring
@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Record query start time"""
    context._query_start_time = time.time()


@event.listens_for(Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Record query end time and log performance"""
    if hasattr(context, '_query_start_time'):
        duration = time.time() - context._query_start_time
        query_monitor.log_query(statement, duration, parameters)


class DatabaseOptimizer:
    """Database optimization utilities"""
    
    @staticmethod
    async def analyze_query_plan(db: AsyncSession, query: str) -> Dict[str, Any]:
        """Analyze query execution plan"""
        try:
            # Get query plan
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
            result = await db.execute(text(explain_query))
            plan = result.fetchone()[0]
            
            return {
                "query": query,
                "execution_plan": plan,
                "analysis": DatabaseOptimizer._analyze_plan(plan)
            }
        except Exception as e:
            return {
                "query": query,
                "error": str(e),
                "analysis": {"recommendations": ["Query analysis failed"]}
            }
    
    @staticmethod
    def _analyze_plan(plan: List[Dict]) -> Dict[str, Any]:
        """Analyze execution plan and provide recommendations"""
        recommendations = []
        warnings = []
        
        def analyze_node(node: Dict):
            node_type = node.get("Node Type", "")
            
            # Check for sequential scans
            if node_type == "Seq Scan":
                table = node.get("Relation Name", "unknown")
                recommendations.append(f"Consider adding index for table '{table}'")
            
            # Check for expensive operations
            if node.get("Total Cost", 0) > 1000:
                recommendations.append(f"High cost operation: {node_type}")
            
            # Check for nested loops with high row counts
            if node_type == "Nested Loop" and node.get("Actual Rows", 0) > 10000:
                warnings.append("Nested loop with high row count - consider join optimization")
            
            # Recursively analyze child nodes
            for child in node.get("Plans", []):
                analyze_node(child)
        
        if plan and len(plan) > 0:
            analyze_node(plan[0])
        
        return {
            "recommendations": recommendations,
            "warnings": warnings,
            "total_cost": plan[0].get("Total Cost", 0) if plan else 0,
            "execution_time": plan[0].get("Actual Total Time", 0) if plan else 0
        }
    
    @staticmethod
    async def get_table_stats(db: AsyncSession) -> Dict[str, Any]:
        """Get database table statistics"""
        try:
            # Get table sizes
            size_query = """
            SELECT 
                schemaname,
                tablename,
                attname,
                n_distinct,
                correlation
            FROM pg_stats 
            WHERE schemaname = 'public'
            ORDER BY tablename, attname;
            """
            
            result = await db.execute(text(size_query))
            stats = result.fetchall()
            
            # Get index usage
            index_query = """
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch
            FROM pg_stat_user_indexes
            ORDER BY tablename, indexname;
            """
            
            result = await db.execute(text(index_query))
            indexes = result.fetchall()
            
            return {
                "table_stats": [dict(row._mapping) for row in stats],
                "index_usage": [dict(row._mapping) for row in indexes]
            }
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    async def suggest_indexes(db: AsyncSession) -> List[Dict[str, Any]]:
        """Suggest missing indexes based on query patterns"""
        suggestions = []
        
        try:
            # Find tables with sequential scans
            seq_scan_query = """
            SELECT 
                schemaname,
                tablename,
                seq_scan,
                seq_tup_read,
                idx_scan,
                idx_tup_fetch
            FROM pg_stat_user_tables
            WHERE seq_scan > idx_scan AND seq_tup_read > 10000
            ORDER BY seq_tup_read DESC;
            """
            
            result = await db.execute(text(seq_scan_query))
            tables = result.fetchall()
            
            for table in tables:
                suggestions.append({
                    "table": table.tablename,
                    "reason": "High sequential scan count",
                    "seq_scans": table.seq_scan,
                    "rows_read": table.seq_tup_read,
                    "recommendation": f"Consider adding indexes to {table.tablename}"
                })
            
            return suggestions
        except Exception as e:
            return [{"error": str(e)}]


# Connection pooling optimization
class ConnectionPoolOptimizer:
    """Optimize database connection pooling"""
    
    @staticmethod
    def get_optimal_pool_size() -> Dict[str, int]:
        """Calculate optimal connection pool size"""
        # Rule of thumb: pool_size = number_of_cpu_cores * 2
        # max_overflow = pool_size * 2
        import os
        cpu_count = os.cpu_count() or 4
        
        return {
            "pool_size": cpu_count * 2,
            "max_overflow": cpu_count * 4,
            "pool_timeout": 30,
            "pool_recycle": 3600  # 1 hour
        }


# Query batching utilities
class QueryBatcher:
    """Batch multiple queries for better performance"""
    
    def __init__(self, batch_size: int = 100):
        self.batch_size = batch_size
        self.pending_queries: List[Callable] = []
        self.batch_timer: Optional[asyncio.Task] = None
    
    async def add_query(self, query_func: Callable):
        """Add query to batch"""
        self.pending_queries.append(query_func)
        
        if len(self.pending_queries) >= self.batch_size:
            await self._execute_batch()
        elif not self.batch_timer:
            # Start timer for batch execution
            self.batch_timer = asyncio.create_task(self._batch_timer())
    
    async def _batch_timer(self):
        """Execute batch after timeout"""
        await asyncio.sleep(0.1)  # 100ms batch window
        await self._execute_batch()
    
    async def _execute_batch(self):
        """Execute all pending queries in batch"""
        if not self.pending_queries:
            return
        
        queries = self.pending_queries.copy()
        self.pending_queries.clear()
        
        if self.batch_timer:
            self.batch_timer.cancel()
            self.batch_timer = None
        
        # Execute queries in parallel
        try:
            await asyncio.gather(*[query() for query in queries])
        except Exception as e:
            print(f"Batch execution error: {e}")


# Performance monitoring decorator
def monitor_query_performance(func):
    """Decorator to monitor query performance"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            
            if duration > 0.5:  # Log queries taking more than 500ms
                print(f"Slow function {func.__name__}: {duration:.3f}s")
            
            return result
        except Exception as e:
            duration = time.time() - start_time
            print(f"Failed function {func.__name__}: {duration:.3f}s - {str(e)}")
            raise
    
    return wrapper


# Database health check
async def check_database_health() -> Dict[str, Any]:
    """Check database health and performance"""
    try:
        async with get_db() as db:
            # Check connection
            await db.execute(text("SELECT 1"))
            
            # Get database stats
            stats_query = """
            SELECT 
                numbackends as active_connections,
                xact_commit as transactions_committed,
                xact_rollback as transactions_rolled_back,
                blks_read as blocks_read,
                blks_hit as blocks_hit,
                tup_returned as tuples_returned,
                tup_fetched as tuples_fetched,
                tup_inserted as tuples_inserted,
                tup_updated as tuples_updated,
                tup_deleted as tuples_deleted
            FROM pg_stat_database 
            WHERE datname = current_database();
            """
            
            result = await db.execute(text(stats_query))
            stats = result.fetchone()
            
            # Calculate cache hit ratio
            cache_hit_ratio = 0
            if stats.blocks_read + stats.blocks_hit > 0:
                cache_hit_ratio = stats.blocks_hit / (stats.blocks_read + stats.blocks_hit) * 100
            
            return {
                "status": "healthy",
                "active_connections": stats.active_connections,
                "cache_hit_ratio": round(cache_hit_ratio, 2),
                "transactions": {
                    "committed": stats.transactions_committed,
                    "rolled_back": stats.transactions_rolled_back
                },
                "tuples": {
                    "returned": stats.tuples_returned,
                    "fetched": stats.tuples_fetched,
                    "inserted": stats.tuples_inserted,
                    "updated": stats.tuples_updated,
                    "deleted": stats.tuples_deleted
                },
                "query_performance": query_monitor.get_stats()
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# Global instances
db_optimizer = DatabaseOptimizer()
connection_optimizer = ConnectionPoolOptimizer()
query_batcher = QueryBatcher()