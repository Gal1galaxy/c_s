from app import db
from app.models.user import User
from datetime import datetime

class File(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(100))
    file_size = db.Column(db.Integer)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    
    # 关系
    owner = db.relationship('User', 
        backref=db.backref('files', lazy=True, cascade='all, delete-orphan')
    )
    
    # shares 关系会由 FileShare 模型的 backref 自动创建

    permissions = db.relationship('FilePermission', backref='file', lazy='dynamic') 
