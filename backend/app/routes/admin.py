from flask_jwt_extended import get_jwt_identity   #JWT token机制
from flask import Blueprint, request, jsonify
from flask_login import current_user
from app import db
from app.models.user import User
from app.models.file import File
from app.utils.auth import login_required  # 使用自定义的装饰器
from functools import wraps
import os

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def admin_required(f):
    ############################更改2025.5.4修改admin_required装饰器JWT############################
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({'error': '需要管理员权限'}), 403
        return f(*args, **kwargs)
    return decorated_function
    ############################更改2025.5.4修改admin_required装饰器JWT############################
    '''
    ##################初始代码##################
    """检查是否是管理员的装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'admin':
            return jsonify({'error': '需要管理员权限'}), 403
        return f(*args, **kwargs)
    return decorated_function
    ##################初始代码##################
    '''

@bp.route('/users', methods=['GET'])
#2025.5.4去掉所有@login_required
@admin_required
def list_users():
    """获取所有用户列表"""
    users = User.query.all()
    return jsonify({
        'users': [{
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role
        } for user in users]
    })

@bp.route('/users/<int:user_id>', methods=['PUT'])
#@login_required
@admin_required
def update_user(user_id):
    """更新用户信息"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if 'role' in data:
        user.role = data['role']
    if 'email' in data:
        user.email = data['email']
        
    db.session.commit()
    return jsonify({
        'message': '用户更新成功',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role
        }
    })

@bp.route('/users/<int:user_id>', methods=['DELETE'])
#@login_required
@admin_required
def delete_user(user_id):
    """删除用户"""
    current_user_id = get_jwt_identity()
    if user_id == current_user_id:
        return jsonify({'error': '不能删除自己的账号'}), 400
        
    user = User.query.get_or_404(user_id)
    
    # 删除用户的文件
    files = File.query.filter_by(owner_id=user_id).all()
    for file in files:
        if os.path.exists(file.file_path):
            os.remove(file.file_path)
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': '用户删除成功'})

@bp.route('/stats', methods=['GET'])
#@login_required
@admin_required
def get_stats():
    """获取系统统计信息"""
    total_users = User.query.count()
    total_files = File.query.count()
    total_size = db.session.query(db.func.sum(File.file_size)).scalar() or 0
    
    return jsonify({
        'total_users': total_users,
        'total_files': total_files,
        'total_size': total_size,
        'storage_usage': f'{total_size / (1024*1024*1024):.2f} GB'
    }) 
