from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, current_user
from app.utils.auth import login_required 
from app.models.operation_log import OperationLog
from app.models.user import User
from app.models.file import File
from app import db
from datetime import datetime

bp = Blueprint('logs', __name__, url_prefix='/api/logs')

@bp.route('/user/<int:user_id>/operations')
#@jwt_required()
@login_required
def get_user_operation_logs(user_id):
    """获取用户的操作日志"""
    try:
        # 获取当前用户ID
        #current_user_id = get_jwt_identity()
        current_user_id = request.current_user.id
        if not current_user_id:
            return jsonify({'error': '未认证'}), 401
            
        # 获取用户信息
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': '用户不存在'}), 404
            
        # 检查权限
        if current_user_id != user_id and user.role != 'admin':
            return jsonify({'error': '没有权限查看此用户的日志'}), 403
            
        # 获取分页参数
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        action = request.args.get('action')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        # 查询日志
        query = db.session.query(
            OperationLog.id,
            OperationLog.operation_type,
            OperationLog.operation_detail,
            OperationLog.created_at,
            OperationLog.file_id,
            File.filename
        ).filter(
            OperationLog.user_id == user_id
        ).outerjoin(
            File, OperationLog.file_id == File.id
        ).order_by(OperationLog.created_at.desc())

        # 筛选操作类型
        if action:
            query = query.filter(OperationLog.operation_type == action)

        # 筛选时间范围
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                query = query.filter(OperationLog.created_at >= start_date)
            except: 
                 pass
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
                end_date = end_date.replace(hour=23, minute=59, second=59)
                query = query.filter(OperationLog.created_at <= end_date)
            except:
                pass

        # 排序分页
        query = query.order_by(OperationLog.created_at.desc())
        
        # 执行分页查询
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # 格式化日志数据
        logs = [{
            'id': item.id,
            'file_id': item.file_id,
            'filename': item.filename if item.filename else None,
            'operation_type': item.operation_type,
            'operation_detail': item.operation_detail,
            'created_at': item.created_at.isoformat()
        } for item in pagination.items]
        
        return jsonify({
            'logs': logs,
            'pagination': {
                'total': pagination.total,
                'pages': pagination.pages,
                'current_page': page,
                'per_page': per_page,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        print(f"Error getting user logs: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/file/<int:file_id>/operations')
@jwt_required()
def get_file_operation_logs(file_id):
    """获取文件的操作日志"""
    try:
        # 获取当前用户ID
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({'error': '未认证'}), 401
            
        # 获取用户信息
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': '用户不存在'}), 404
            
        # 检查文件访问权限
        file = File.query.get_or_404(file_id)
        if file.owner_id != current_user_id and user.role != 'admin':
            return jsonify({'error': '没有权限查看此文件的日志'}), 403
            
        # 获取分页参数
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 查询日志
        query = db.session.query(
            OperationLog.id,
            OperationLog.operation_type,
            OperationLog.operation_detail,
            OperationLog.created_at,
            User.id.label('user_id'),
            User.username
        ).filter(
            OperationLog.file_id == file_id
        ).join(
            User, OperationLog.user_id == User.id
        ).order_by(OperationLog.created_at.desc())
        
        # 执行分页查询
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # 格式化日志数据
        logs = [{
            'id': item.id,
            'user_id': item.user_id,
            'username': item.username,
            'operation_type': item.operation_type,
            'operation_detail': item.operation_detail,
            'created_at': item.created_at.isoformat()
        } for item in pagination.items]
        
        return jsonify({
            'logs': logs,
            'pagination': {
                'total': pagination.total,
                'pages': pagination.pages,
                'current_page': page,
                'per_page': per_page,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        print(f"Error getting file logs: {str(e)}")
        return jsonify({'error': str(e)}), 500 
