from app import db
from app.models.share import FileShare
from app.models.file import File
from datetime import datetime
import secrets

class ShareService:
    def create_share(self, file_id, shared_by, shared_with=None, can_write=False, expires_at=None):
        """创建文件分享"""
        # 生成唯一的分享码
        share_code = secrets.token_urlsafe(16)
        
        share = FileShare(
            file_id=file_id,
            shared_by=shared_by,
            shared_with=shared_with,
            share_code=share_code,
            can_write=can_write,
            expires_at=expires_at
        )
        
        db.session.add(share)
        db.session.commit()
        return share
    
    def get_share_by_code(self, share_code):
        """通过分享码获取分享信息"""
        share = FileShare.query.filter_by(share_code=share_code).first()
        if not share:
            return None
            
        # 检查是否过期
        if share.expires_at and share.expires_at < datetime.utcnow():
            share.is_expired = True
        else:
            share.is_expired = False
            
        return share
    
    def get_user_shares(self, user_id):
        ####################新增2025.5.4重构分享代码####################
        """获取用户的创建的分享"""
        return FileShare.query.filter_by(shared_by=user_id).all()
        ####################新增2025.5.4重构分享代码####################
        '''
        ##########初始代码 ##########
        """获取用户的所有分享"""
        shares = FileShare.query.filter_by(shared_by=user_id).all()
        return {
            'sharedFiles': shares,
            'receivedShares': self.get_received_shares(user_id)
        }
        ##########初始代码 ##########
        '''
    
    def get_received_shares(self, user_id):
        ####################新增2025.5.4重构分享代码####################
        """获取别人分享给当前用户的分享"""
        return FileShare.query.filter_by(shared_with=user_id).all()
        ####################新增2025.5.4重构分享代码####################
        
        '''
        ##########初始代码 ##########
        """获取用户收到的所有分享"""
        return FileShare.query.filter_by(shared_with=user_id).all()
        ##########初始代码 ##########
        '''
        
    ######################更改2025.5.4新的撤销分享函数######################
    def revoke_share(self, share_id, user_id):
        """撤销分享"""
        share = FileShare.query.get(share_id)
        if not share:
            return False

        try:
            user_id = int(user_id) #强制转换成int进行对比
        except Exception as e:
            print(f"Invalid user_id: {user_id}, error: {e}")
            return False
            
        # 检查当前用户是不是分享发起人 或者 接受人
        if share.shared_by == user_id or share.shared_with == user_id:
            db.session.delete(share)
            db.session.commit()
            return True
        return False
    ######################更改2025.5.4新的撤销分享函数######################
    '''###################初始代码###################
    def revoke_share(self, share_id, user_id):
        """撤销分享"""
        share = FileShare.query.get(share_id)
        if share and share.shared_by == user_id:
            db.session.delete(share)
            db.session.commit()
            return True
        return False
    ###################初始代码###################'''
    
    def check_share_permission(self, share_code, user_id=None):
        """检查分享权限"""
        share = self.get_share_by_code(share_code)
        if not share or share.is_expired:
            return None
            
        if share.shared_with and share.shared_with != user_id:
            return None
            
        return share

    def to_dict(self, share):
        """将分享对象转换为字典"""
        return {
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
            'isExpired': share.is_expired
        }

    def get_share_info(self, share_code):
        """获取分享信息"""
        try:
            share = self.get_share_by_code(share_code)
            if not share:
                return None
            
            # 检查是否过期
            if share.is_expired:
                return None
            
            return {
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
                    'isExpired': share.is_expired
                }
            }
        except Exception as e:
            print(f'Error in get_share_info: {str(e)}')  # 添加错误日志
            return None 
