from app import db
from datetime import datetime

class OperationLog(db.Model):
    __tablename__ = 'operation_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # 移除外键约束
    file_id = db.Column(db.Integer)  # 移除外键约束，允许为空
    operation_type = db.Column(db.String(50), nullable=False)
    operation_detail = db.Column(db.Text)
    resource_type = db.Column(db.String(50))  # 新增
    ip_address = db.Column(db.String(100))    # 新增
    user_agent = db.Column(db.String(255))    # 新增
    status = db.Column(db.String(20), default='success')  # 新增
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<OperationLog {self.operation_type} on file {self.file_id} by user {self.user_id}>' 
