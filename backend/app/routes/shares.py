from flask_jwt_extended import verify_jwt_in_request_optional, get_jwt_identity   #JWT机制
from flask import Blueprint, request, jsonify
from app.services.share_service import ShareService
from app.services.file_service import FileService
from app.utils.auth import login_required
from datetime import datetime, timedelta
from app.models.user import User

bp = Blueprint('shares', __name__, url_prefix='/api/shares')
share_service = ShareService()
file_service = FileService()

@bp.route('/create', methods=['POST'])
@login_required
def create_share():
    """创建文件分享"""
    try:
        data = request.get_json()
        file_id = data.get('fileId')
        shared_with_username = data.get('sharedWith')#更改2025.5.4初始代码：shared_with = data.get('sharedWith')  # 用户ID或null
        can_write = data.get('canWrite', False)
        expires_days = data.get('expiresDays')  # 过期天数
        
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)
            
        #新增2025.5.4如果有 sharedWith，需要通过用户名找到对应的 user_id
        shared_with_id = None
        if shared_with_username:
            user = User.query.filter_by(username=shared_with_username).first()
            if not user:
                return jsonify({'error': '被分享的用户不存在'}), 400
            shared_with_id = user.id
        
        share = share_service.create_share(
            file_id=file_id,
            shared_by=get_jwt_identity(),#更改2025.5.4改成JWT验证shared_by=request.current_user.id,------>shared_by=get_jwt_identity(),
            shared_with=shared_with_id,
            can_write=can_write,
            expires_at=expires_at
        )
        
        return jsonify({
            'message': '分享创建成功',
            'share': {
                'id': share.id,
                'shareCode': share.share_code,
                'canWrite': share.can_write,
                'expiresAt': share.expires_at.isoformat() if share.expires_at else None,
                'createdAt': share.created_at.isoformat()
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/list', methods=['GET'])
@login_required
def list_shares():
    ################################新增2025.5.4重构分享代码################################
    """获取用户的分享列表"""
    try:
        user_id = get_jwt_identity() #JWT获取id
        shared_files = share_service.get_user_shares(user_id)
        received_shares = share_service.get_received_shares(user_id)
        return jsonify({
            'sharedFiles': [share_service.to_dict(share) for share in shared_files],
            'receivedShares': [share_service.to_dict(share) for share in received_shares]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    ################################新增2025.5.4重构分享代码################################
    
    '''
    ################################初始代码################################
    """获取用户的分享列表"""
    try:
        print(f'current_user: {request.current_user.id}')
        shared_files = share_service.get_user_shares(request.current_user.id)
        print(f'shared_files: {shared_files}')
        received_shares = share_service.get_received_shares(request.current_user.id)
        print(f'received_shares: {received_shares}')
        for share in shared_files['sharedFiles']:
            print(f'share: {share}')
            #print(f'id: {share.id}, filename: {share.file.filename}')

        return jsonify({
            'sharedFiles': [{
                'id': share.id,
                'file': file_service.to_dict(share.file),
                'shareCode': share.share_code,
                'sharedWith': share.shared_with,
                'canWrite': share.can_write,
                'expiresAt': share.expires_at.isoformat() if share.expires_at else None,
                'createdAt': share.created_at.isoformat() if share.expires_at else None
            } for share in shared_files['sharedFiles']],
            'receivedShares': [{
                'id': share.id,
                'file': file_service.to_dict(share.file),
                'sharedBy': share.shared_by,
                'shareCode': share.share_code,
                'canWrite': share.can_write,
                'expiresAt': share.expires_at.isoformat() if share.expires_at else None,
                'createdAt': share.created_at.isoformat() if share.expires_at else None
            } for share in received_shares]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    ################################初始代码################################
    '''

@bp.route('/revoke/<int:share_id>', methods=['DELETE'])
@login_required
def revoke_share(share_id):
    """撤销分享"""
    try:
        user_id = get_jwt_identity()   #JWT获取user_id
        if share_service.revoke_share(share_id, user_id):
            return jsonify({'message': '分享已撤销'})
        return jsonify({'error': '无权操作或分享不存在'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<share_code>',methods=['GET'])
############################更改2025.5.5重构分享代码############################
def get_share_info(share_code):
    """通过分享码获取分享详情"""
    try:
        share = share_service.get_share_by_code(share_code)
        if not share:
            return jsonify({'error': '分享不存在或已过期'}), 404

        # 检查是否私人分享
        if share.shared_with is not None:
            # 私人分享，需要身份验证
            verify_jwt_in_request_optional()
            current_user_id = get_jwt_identity()
            if current_user_id is None or int(current_user_id) != int(share.shared_with):
                return jsonify({'error': '没有权限访问此分享'}), 403

        # 公开分享，或者本人访问，正常返回数据
        return jsonify({
            'share': {
                'id': share.id,
                'file': {  
                    'id': share.file.id,
                    'filename': share.file.filename,
                    'file_type': share.file.file_type,
                    'file_size': share.file.file_size
                },
                'shareCode': share.share_code,
                'sharedBy': share.owner.username if share.owner else None,
                'sharedWith': share.recipient.username if share.recipient else None,
                'canWrite': share.can_write,
                'expiresAt': share.expires_at.isoformat() if share.expires_at else None,
                'createdAt': share.created_at.isoformat() if share.created_at else None,
                'isExpired': getattr(share, 'is_expired', False)
            }
        })
    except Exception as e:
        print(f'Error in get_share_info: {str(e)}')
        return jsonify({'error': str(e)}), 500
        
############################更改2025.5.5重构分享代码############################
'''###############初始代码###############
def get_share_info(share_code):
    """获取分享信息"""
    try:
        print(f'share_code: {share_code}')
        share_info = share_service.get_share_info(share_code)
        print(f'share_info: {share_info}')
        
        if not share_info:
            return jsonify({'error': '分享不存在或已过期'}), 404
            
        return jsonify(share_info)
    except Exception as e:
        print(f'Error in get_share_info: {str(e)}')
        return jsonify({'error': str(e)}), 500 
###############初始代码###############'''
