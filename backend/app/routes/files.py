from flask import Blueprint, request, jsonify, send_file
from flask_login import current_user
from app import db
from app.models.file import File
from app.models.permission import FilePermission
from app.services.file_service import FileService
from app.services.permission_service import PermissionService
from app.services.preview_service import PreviewService
from app.services.log_service import LogService
from app.services.share_service import ShareService
from app.utils.auth import login_required  # 使用自定义的装饰器
from app.models.operation_log import OperationLog
from flask_jwt_extended import jwt_required
import os

bp = Blueprint('files', __name__, url_prefix='/api/files')
file_service = FileService()
permission_service = PermissionService()
preview_service = PreviewService()
log_service = LogService()
share_service = ShareService()

@bp.route('/upload', methods=['POST'])
@login_required
def upload_file():
    """上传文件"""
    if 'file' not in request.files:
        return jsonify({'error': '没有文件'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
        
    try:
        saved_file = file_service.save_file(file, request.current_user.id)
        log_service.log_action('upload', 'file', saved_file.id, 
            details={'filename': saved_file.filename})
            
        return jsonify({
            'message': '文件上传成功',
            'file': {
                'id': saved_file.id,
                'filename': saved_file.filename,
                'file_type': saved_file.file_type,
                'file_size': saved_file.file_size
            }
        })
    except Exception as e:
        log_service.log_action('upload', 'file', None, 
            status='failed', details={'error': str(e)})
        return jsonify({'error': str(e)}), 500

@bp.route('/download/<int:file_id>', methods=['GET'])
def download_file(file_id):
    """下载文件"""
    try:
        share_code = request.args.get('shareCode')
        user_id = None
##############新增2025.5.1download_file方法,从token中解析user_id，不依赖current_user##############
        #尝试提取 Authorization Bearer Token
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            from flask_jwt_extended import decode_token
            try:
                decoded_token = decode_token(token)
                user_id = int(decoded_token['sub'])
            except Exception as e:
                print(f"Token decode error: {str(e)}")
##############新增2025.5.1download_file方法,从token中解析user_id，不依赖current_user##############
                
        if share_code:
            # 通过分享码访问
            share = share_service.get_share_by_code(share_code)
            if not share or share.file_id != file_id:
                return jsonify({'error': '分享不存在或已过期'}), 404
                
            if share.is_expired:
                return jsonify({'error': '分享已过期'}), 403
        else:
            ################2025.5.1新增：在尝试访问current_user.id之前，检查用户是否已登录################
            # 没有分享码，需要已登录
            if not user_id:
                return jsonify({'error': '请先登录'}), 401
            # 直接访问需要验证权限
            if not permission_service.can_read(user_id, file_id):
                return jsonify({'error': '无权访问此文件'}), 403
            ################2025.5.1新增：在尝试访问current_user.id之前，检查用户是否已登录################
        
        file = File.query.get_or_404(file_id)
        
        '''2025.5.1更改文件下载逻辑（初始代码）
        return send_file(
            file_service.get_decrypted_file_path(file),
            as_attachment=True,
            download_name=file.filename
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        2025.5.1更改文件下载逻辑（初始代码）'''
        
         #########新增2025.5.1更改文件下载逻辑#########
         # 获取解密后的临时文件路径（发送文件）
        temp_path = file_service.get_decrypted_file_path(file)

        # 确保临时文件存在
        if not os.path.exists(temp_path):
            return jsonify({'error': '文件解密失败，找不到临时文件'}), 500

        # 发送文件
        return send_file(
            temp_path,
            as_attachment=True,
            download_name=file.filename
        )
    except Exception as e:
        print(f"Download file error: {str(e)}")  # 打印错误日志
        return jsonify({'error': str(e)}), 500
         #########新增2025.5.1更改文件下载逻辑#########    
        
@bp.route('/list', methods=['GET'])
@login_required
def list_files():
    """获取文件列表"""
    try:
        # 使用请求上下文中的用户信息
        user = request.current_user
        
        # 获取用户拥有的文件
        owned_files = File.query.filter_by(owner_id=user.id).all()
        
        return jsonify({
            'owned_files': [{
                'id': file.id,
                'filename': file.filename,
                'file_type': file.file_type,
                'file_size': file.file_size,
                'created_at': file.created_at.isoformat() if file.created_at else None,
                'is_public': file.is_public
            } for file in owned_files]
        })
    except Exception as e:
        print(f"Error in list_files: {str(e)}")
        return jsonify({'error': f'获取文件列表失败: {str(e)}'}), 500

@bp.route('/<int:file_id>', methods=['DELETE'])
@login_required
def delete_file(file_id):
    """删除文件"""
    file = File.query.get_or_404(file_id)
    
    if file.owner_id != request.current_user.id and request.current_user.role != 'admin':
        return jsonify({'error': '没有权限删除此文件'}), 403
        
    try:
        # 删除物理文件
        if os.path.exists(file.file_path):
            os.remove(file.file_path)

        file_service.log_operation(
            user_id=file.owner_id,
            file_id=file.id,
            operation_type='delete',
            operation_detail=f'删除文件：{file.filename}'
        )
            
        print(file.filename)
        # 删除数据库记录
        db.session.delete(file)
        db.session.commit()
        print('delete success')
            
        return jsonify({'message': '文件删除成功'})
    except Exception as e:
        log_service.log_action('delete', 'file', file_id, 
            status='failed', details={'error': str(e)})
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:file_id>/preview', methods=['GET'])
def preview_file(file_id):
    """预览文件"""
    try:
        share_code = request.args.get('shareCode')
        user_id = None
        # 尝试从 token 里提取 user_id
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            from flask_jwt_extended import decode_token
            try:
                token = auth_header.split(' ')[1]
                decoded_token = decode_token(token)
                user_id = int(decoded_token['sub'])
            except Exception as e:
                print(f"Token decode error: {str(e)}")
            
        if share_code:
            # 通过分享码访问
            share = share_service.get_share_by_code(share_code)
            if not share or share.file_id != file_id:
                return jsonify({'error': '分享不存在或已过期'}), 404
            if share.is_expired:
                return jsonify({'error': '分享已过期'}), 403
            # 检查是否私人分享
            if share.shared_with is not None and user_id != share.shared_with:
                return jsonify({'error': '没有权限访问此分享'}), 403
        else:
            # 直接访问需要验证权限
            if not user_id:
                return jsonify({'error': '请先登录'}), 401
            if not permission_service.can_read(current_user.id, file_id):
                return jsonify({'error': '无权访问此文件'}), 403
        
        file = File.query.get_or_404(file_id)
        # 调用 preview_service 获取预览内容
        preview_data = preview_service.get_preview(file)
        return jsonify(preview_data)
    except Exception as e:
        print(f"Preview file error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/update/<int:file_id>', methods=['POST'])
@login_required
def update_file(file_id):
    """更新文件内容"""
    if 'file' not in request.files:
        return jsonify({'error': '没有文件'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
        
    try:
        # 获取原文件
        original_file = File.query.get_or_404(file_id)
        
        # 检查权限
        if original_file.owner_id != request.current_user.id:
            return jsonify({'error': '没有权限修改此文件'}), 403
            
        # 更新文件
        file_service.update_file(original_file, file)
        
        log_service.log_action('update', 'file', file_id, 
            details={'filename': original_file.filename})
            
        return jsonify({'message': '文件更新成功'})
    except Exception as e:
        log_service.log_action('update', 'file', file_id, 
            status='failed', details={'error': str(e)})
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:file_id>', methods=['GET'])
@login_required
def get_file(file_id):
    """获取单个文件信息"""
    try:
        file = File.query.get_or_404(file_id)
        
        # 检查权限
        if not permission_service.can_read(request.current_user.id, file_id):
            return jsonify({'error': '没有权限访问此文件'}), 403
            
        return jsonify({
            'file': {
                'id': file.id,
                'filename': file.filename,
                'file_type': file.file_type,
                'file_size': file.file_size,
                'created_at': file.created_at.isoformat() if file.updated_at else None,
                'updated_at': file.updated_at.isoformat() if file.updated_at else None,
                'is_public': file.is_public,
                'owner_id': file.owner_id
            }
        })
    except Exception as e:
        print(f"Error getting file: {str(e)}")
        return jsonify({'error': f'获取文件信息失败: {str(e)}'}), 500

@bp.route('/<int:file_id>/content', methods=['GET'])
def get_file_content(file_id):
    """查看文件内容（支持预览各种类型）"""
    try:
        share_code = request.args.get('shareCode')
        user_id = get_user_id_from_token()

        if share_code:
            share = share_service.get_share_by_code(share_code)
            if not share or share.file_id != file_id:
                return jsonify({'error': '分享不存在或已过期'}), 404
            if share.is_expired:
                return jsonify({'error': '分享已过期'}), 403
            if share.shared_with and share.shared_with != user_id:
                return jsonify({'error': '没有权限访问此分享'}), 403
        else:
            if not user_id:
                return jsonify({'error': '请先登录'}), 401
            if not permission_service.can_read(user_id, file_id):
                return jsonify({'error': '无权访问此文件'}), 403

        file = File.query.get_or_404(file_id)

        # 🔥 统一用 preview_service 处理
        preview_data = preview_service.get_preview(file)

        return jsonify(preview_data)
    except Exception as e:
        print(f"Get content error: {str(e)}")
        return jsonify({'error': str(e)}), 500

'''
def get_file_content(file_id):
    """获取文件内容"""
    try:
        print(f"Getting content for file_id: {file_id}")  # 调试日志
        share_code = request.args.get('shareCode')
        share = None  # 初始化 share 变量
        has_permission = True  # 默认有权限
        user_id = get_user_id_from_token()
        
        if share_code:
            # 通过分享码访问
            share = share_service.get_share_by_code(share_code)
            print(f"Share info: {share}")  # 调试日志
            
            if not share:
                print("Share not found")  # 调试日志
                return jsonify({'error': '分享不存在或已过期'}), 404
                
            if share.file_id != file_id:
                print(f"File ID mismatch: share.file_id={share.file_id}, file_id={file_id}")  # 调试日志
                return jsonify({'error': '分享链接无效'}), 404
                
            if share.is_expired:
                print("Share expired")  # 调试日志
                return jsonify({'error': '分享已过期'}), 403
                
            has_permission = share.can_write
            print(f"Share permission: can_write={has_permission}")  # 调试日志
        else:
            # 直接访问需要验证权限
            if not hasattr(current_user, 'id'):
                print("User not logged in")  # 调试日志
                return jsonify({'error': '请先登录'}), 401
                
            if not permission_service.can_read(current_user.id, file_id):
                print(f"No read permission for user {current_user.id}")  # 调试日志
                return jsonify({'error': '无权访问此文件'}), 403
                
            has_permission = permission_service.can_write(current_user.id, file_id)
            print(f"Direct access permission: can_write={has_permission}")  # 调试日志
        
        file = File.query.get_or_404(file_id)
        print(f"Found file: {file.filename}")  # 调试日志
        
        try:
            # 获取文件内容和基本信息
            file_data = file_service.get_file_content(file)
            #print(f"Got file data type: {type(file_data)}")  # 调试日志
            #print(f"File data: {file_data}")  # 调试日志
            
            # 确保返回完整的文件信息
            response_data = {
                'id': file.id,
                'filename': file.filename,
                'file_type': file_data.get('file_type', file.file_type),
                'file_size': file.file_size,
                'content': file_data.get('content'),
                'created_at': file.created_at.isoformat() if file.created_at else None,
                'updated_at': file.updated_at.isoformat() if file.updated_at else None,
                'owner_id': file.owner_id,
                'can_write': has_permission  # 使用统一的权限变量
            }
            
            return jsonify(response_data)
        except Exception as e:
            print(f"Error getting file content: {str(e)}")  # 调试日志
            return jsonify({'error': f'获取文件内容失败: {str(e)}'}), 500
            
    except Exception as e:
        print(f"Error in get_file_content route: {str(e)}")  # 调试日志
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:file_id>/content', methods=['POST'])
def update_file_content(file_id):
    """更新文件内容"""
    try:
        share_code = request.args.get('shareCode')
        
        if share_code:
            # 通过分享码访问
            share = share_service.get_share_by_code(share_code)
            if not share or share.file_id != file_id:
                return jsonify({'error': '分享不存在或已过期'}), 404
                
            if share.is_expired:
                return jsonify({'error': '分享已过期'}), 403
                
            if not share.can_write:
                return jsonify({'error': '无编辑权限'}), 403
        else:
            # 直接访问需要验证权限
            if not permission_service.can_write(current_user.id, file_id):
                return jsonify({'error': '无权编辑此文件'}), 403
        
        file = File.query.get_or_404(file_id)
        content = request.get_json()
        print(f"Updating file content: {content}")  # 调试日志
        file_service.update_file_content(file, content)
        return jsonify({'message': '更新成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        '''

@bp.route('/files/<int:file_id>/logs')
@jwt_required()
def get_file_logs(file_id):
    """获取文件操作日志"""
    try:
        file = File.query.get_or_404(file_id)
        
        # 检查权限
        if not permission_service.can_read(current_user.id, file_id):
            return jsonify({'error': '没有权限查看此文件的日志'}), 403
        
        # 获取日志
        logs = OperationLog.query\
            .filter_by(file_id=file_id)\
            .order_by(OperationLog.created_at.desc())\
            .all()
        
        return jsonify({
            'logs': [{
                'id': log.id,
                'user_id': log.user_id,
                'username': log.user.username,
                'operation_type': log.operation_type,
                'operation_detail': log.operation_detail,
                'created_at': log.created_at.isoformat()
            } for log in logs]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
