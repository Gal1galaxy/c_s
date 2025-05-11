import os
from datetime import timedelta
import secrets

# 获取项目根目录
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

class Config:
    # 基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f"sqlite:///{os.path.join(BASE_DIR, 'cloud_storage.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT配置
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    
    # 文件上传配置
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    TEMP_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'temp')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    
    # AES加密配置 - 确保密钥长度正确
    AES_KEY = os.environ.get('AES_KEY') or b'0123456789abcdef0123456789abcdef'  # 32字节
    AES_IV = os.environ.get('AES_IV') or b'0123456789abcdef'  # 16字节
    
    # CORS配置
    CORS_HEADERS = 'Content-Type'
    
    # Cookie安全配置
    SESSION_COOKIE_SECURE = False  # 开发环境设为 False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = None  # 允许跨域请求
    
    # Flask-Login配置
    SESSION_PROTECTION = 'strong'
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_DURATION = timedelta(days=7)

class DevelopmentConfig(Config):
    DEBUG = True
    
class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
class ProductionConfig(Config):
    DEBUG = False
    # 生产环境应使用环境变量设置敏感信息
    
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
} 
