from dateutil import parser  #2025.5.11解决时间同步问题
from sqlalchemy import func, text  #2025.5.11解决时间同步问题
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
            log = Log(
                user_id=request.current_user.id,
                operation_type=action,
                resource_type=resource_type,
                file_id=resource_id,
                operation_detail=details,
                created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
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
        query = Log.query.filter(Log.user_id == user_id)

        if action:
            query = query.filter(Log.operation_type == action)
             
        if start_date:  #筛选日期过滤
            try:
                query = query.filter(text(f"datetime(created_at) >= datetime('{start_date}')"))
            except Exception as e:
                print(f"start_date parse error: {e}")

        if end_date:
            try:
                query = query.filter(text(f"datetime(created_at) <= datetime('{end_date}')"))
            except Exception as e:
                print(f"end_date parse error: {e}")

        print(query.statement.compile(compile_kwargs={"literal_binds": True}))
        return query.order_by(Log.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def get_resource_logs(resource_type, resource_id, page=1, per_page=20):
        """获取资源的操作日志"""
        return Log.query.filter_by(
            resource_type=resource_type,
            resource_id=resource_id
        ).order_by(Log.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
