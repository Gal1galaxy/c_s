from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from app.services.permission_service import PermissionService
from app.models.file import File
import json
import pandas as pd
from datetime import datetime

socketio = SocketIO()
permission_service = PermissionService()

# 存储当前编辑状态
active_editors = {}  # {file_id: {user_id: timestamp}}
file_contents = {}   # {file_id: DataFrame}

def extract_user_id_from_token(token):
    """从 JWT token 中提取用户 ID"""
    try:
        decoded = decode_token(token)
        return int(decoded['sub'])
    except Exception as e:
        print(f"Token decode error: {str(e)}")
        return None

@socketio.on('connect')
def handle_connect():
    emit('connected', {'message': '连接成功'})

@socketio.on('join_edit')
def handle_join(data):
    """加入协同编辑"""
    file_id = data['file_id']
    token = data.get('auth', {}).get('token')
    user_id = extract_user_id_from_token(token)

    if not user_id:
         emit('error', {'message': '无效身份，请重新登录'})
         return
    
    # 检查权限
    if not permission_service.can_write(user_id, file_id):
        emit('error', {'message': '没有编辑权限'})
        return
        
    # 加入房间
    room = f'file_{file_id}'
    join_room(room)
    
    # 记录编辑状态
    if file_id not in active_editors:
        active_editors[file_id] = {}
    active_editors[file_id][user_id] = datetime.utcnow()
    
    # 如果是第一个编辑者，加载文件内容
    if file_id not in file_contents:
        file = File.query.get(file_id)
        if file.file_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            df = pd.read_excel(file.file_path)
            file_contents[file_id] = df.to_dict('records')
    
    # 广播有新用户加入
    emit('user_joined', {
        'user_id': user_id,
        'active_users': list(active_editors[file_id].keys())
    }, room=room)
    
    # 发送当前文件内容
    emit('file_content', {
        'content': file_contents.get(file_id, [])
    })

@socketio.on('cell_update')
def handle_cell_update(data):
    """处理单元格更新"""
    file_id = data['file_id']
    user_id = data['user_id']
    row = data['row']
    col = data['col']
    value = data['value']
    token = data.get('auth', {}).get('token')
    user_id = extract_user_id_from_token(token)

     if not user_id:
         emit('error', {'message': '未授权'})
         return
    
    room = f'file_{file_id}'
    
    # 更新内容
    if file_id in file_contents:
        if 0 <= row < len(file_contents[file_id]):
            file_contents[file_id][row][col] = value
            
            # 广播更新
            emit('cell_updated', {
                'row': row,
                'col': col,
                'value': value,
                'user_id': user_id
            }, room=room)

@socketio.on('save_file')
def handle_save(data):
    """保存文件"""
    file_id = data['file_id']
    token = data.get('auth', {}).get('token')
    user_id = extract_user_id_from_token(token)

    if not user_id:
        emit('error', {'message': '未授权'})
        return
    
    if file_id in file_contents:
        try:
            file = File.query.get(file_id)
            df = pd.DataFrame(file_contents[file_id])
            df.to_excel(file.file_path, index=False)
            emit('save_success', {'message': '文件保存成功'})
        except Exception as e:
            emit('error', {'message': f'保存失败: {str(e)}'})

@socketio.on('leave_edit')
def handle_leave(data):
    """离开协同编辑"""
    file_id = data['file_id']
    token = data.get('auth', {}).get('token')
    user_id = extract_user_id_from_token(token)

    if not user_id:
        return
        
    room = f'file_{file_id}'
    
    # 清理编辑状态
    if file_id in active_editors and user_id in active_editors[file_id]:
        del active_editors[file_id][user_id]
        
    # 如果没有活跃用户，清理内容缓存
    if file_id in active_editors and not active_editors[file_id]:
        if file_id in file_contents:
            del file_contents[file_id]
            
    leave_room(room)
    
    # 广播用户离开
    emit('user_left', {
        'user_id': user_id,
        'active_users': list(active_editors.get(file_id, {}).keys())
    }, room=room) 
