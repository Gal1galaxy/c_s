from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_login import LoginManager
from config import config
import os
import json
from datetime import timedelta

naming_convention = {
    "ix": 'ix_%(column_0_label)s',
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(column_0_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

# 初始化扩展
#db = SQLAlchemy(metadata=MetaData(naming_convention=naming_convention))
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
socketio = SocketIO(
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
    async_mode='gevent'
)
login_manager = LoginManager()

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # 设置 secret key
    app.secret_key = app.config['SECRET_KEY']
    
    # 初始化扩展
    db.init_app(app)
    migrate.init_app(app, db)
    
    # 配置CORS，允许携带认证信息
    CORS(app, resources={
        r"/*": {
            "origins": "*",
            "supports_credentials": True
        }
    })
    
    # JWT配置
    jwt = JWTManager(app)
    
    @jwt.user_identity_loader
    def user_identity_lookup(user):
        if isinstance(user, int):
            return user
        return user.id if hasattr(user, 'id') else user
    
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        from app.models.user import User
        identity = jwt_data["sub"]
        return User.query.filter_by(id=identity).one_or_none()
    
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        json=json
    )
    
    # 初始化 Flask-Login
    login_manager.init_app(app)
    login_manager.session_protection = "strong"
    
    # 创建上传目录
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['TEMP_FOLDER'], exist_ok=True)
    
    # 注册蓝图
    from .routes import auth, files, admin, shares, logs
    app.register_blueprint(auth.bp)
    app.register_blueprint(files.bp)
    app.register_blueprint(admin.bp)
    app.register_blueprint(shares.bp)
    app.register_blueprint(logs.bp)
    
    # 导入 WebSocket 处理器
    from .websockets import excel_handler
    
    @login_manager.user_loader
    def load_user(user_id):
        from .models.user import User
        return User.query.get(int(user_id))
    
    # 注册命令
    from .commands import init_db_command
    app.cli.add_command(init_db_command)

    #返回错误代码
    app.config['PROPAGATE_EXCEPTIONS'] = True //强制 Flask 遇到错误时，不吞掉，直接抛出
    app.config['TRAP_HTTP_EXCEPTIONS'] = True //HTTP 错误（404、500），也抛出详细异常，不直接短路返回Response
    
    return app 
