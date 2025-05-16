后端使用python，前端使用react.js，数据库使用sqlite。
开发和运行环境是ubuntu 24.04。

1、代码结构：
cloud-storage/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask应用初始化
│   │   ├── models/              # 数据库模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # 用户模型
│   │   │   ├── file.py          # 文件模型
│   │   │   └── log.py           # 日志模型
│   │   ├── api/                 # API路由和处理
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # 认证相关API
│   │   │   ├── files.py         # 文件操作API
│   │   │   └── admin.py         # 管理员API
│   │   ├── services/            # 业务逻辑
│   │   │   ├── __init__.py
│   │   │   ├── file_service.py  # 文件处理服务
│   │   │   ├── auth_service.py  # 认证服务
│   │   │   └── log_service.py   # 日志服务
│   │   └── utils/               # 工具函数
│   │       ├── __init__.py
│   │       ├── crpyto.py      # 安全相关工具
│   │       └── auth.py    # 用户验证工具
│   ├── migrations/              # 数据库迁移文件
│   ├── storage/                 # 文件存储目录
│   │   ├── uploads/            # 上传文件
│   │   └── temp/               # 临时文件
│   ├── config.py               # 配置文件
│   ├── requirements.txt        # Python依赖
│   └── run.py                  # 应用入口
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/         # React组件
│   │   ├── pages/             # 页面组件
│   │   ├── contexts/          # Context组件
│   │   ├── services/          # API服务
│   │   ├── utils/             # 工具函数
│   │   ├── styles/            # 样式文件
│   │   ├── tests/             # 测试文件
│   │   └── App.js             # 主应用组件
│   ├── package.json           # npm配置
│   └── README.md              # 前端文档
├── .gitignore                 # Git忽略文件
├── cloud_storage.db           # sqlite3数据库文件
└── README.md                  # 项目说明 

2、安装依赖：
安装nodejs，如果已经安装可以跳过这一步，或者用其他方式安装nodejs和npm
sudo apt-get install nodejs npm
配置nginx代理
sudo nginx -t         # 检查语法是否正确
sudo nginx -s reload  # 重载配置使其生效

#安装需要的软件包
sudo apt-get install poppler-utils

安装依赖的npm包：
在项目根目录下执行：
cd frontend
npm install

安装依赖的python包：
在项目根目录下执行：
pip install -r backend/requirements.txt

3、运行：

在/backend先运行_init_db.py初始化数据库

先运行后端：
cd backend
python run.py 
这样会运行后端接口，默认监听本地5000端口，保持程序一直运行。

服务器使用tmux命令运行后端，这样可以随时重连查看后端窗口

运行前端：
cd frontend
npm run build
打开浏览器就可以正常访问了
可以用admin用户登录，密码是admin123。
