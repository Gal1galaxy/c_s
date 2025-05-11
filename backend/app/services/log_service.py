from app import db
from app.models.operation_log import OperationLog as Log
from flask import request
from datetime import datetime
import json

class LogService:
    @staticmethod
    def log_action(action, resource_type, resource_id, details=None, status='success'):
        """记录用户操作"""
        try:
            log = OperationLog(
                user_id=request.current_user.id,
                operation_type=action,
                resource_type=resource_type,
                file_id=resource_id,
                operation_detail=details,
                created_at=datetime.utcnow(),
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string,
                status=status
            )
            print(log)
            db.session.add(log)
            db.session.commit()
            return log
        except Exception as e:
            db.session.rollback()
            print(f"Error logging action: {str(e)}")
            return None

    @staticmethod
    def get_user_logs(user_id, page=1, per_page=20, action=None, start_date=None, end_date=None):
        """获取用户的操作日志，支持筛选"""
        query = Log.query.filter_by(user_id=user_id)

        if action:
            query = query.filter(Log.action == action)

        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(Log.created_at >= start)
            except ValueError:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d")
                end = end.replace(hour=23, minute=59, second=59)
                query = query.filter(Log.created_at <= end)
            except ValueError:
                pass

        return query.order_by(Log.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def get_resource_logs(resource_type, resource_id, page=1, per_page=20):
        """获取资源的操作日志"""
        return Log.query.filter_by(
            resource_type=resource_type,
            resource_id=resource_id
        ).order_by(Log.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
