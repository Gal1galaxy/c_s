from flask_socketio import emit, join_room, leave_room
from app import socketio
from flask import request
from app.models.file import File
from app.services.permission_service import PermissionService
from datetime import datetime
from app.services.file_service import FileService

permission_service = PermissionService()
file_service = FileService()

# 存储文件编辑状态
file_editors = {}  # {file_id: {user_id: {'username': username, 'last_active': timestamp}}}
file_data = {}    # {file_id: {'cells': {}, 'last_updated': timestamp}}
cell_locks = {}   # {file_id: {'cell_key': {'user_id': user_id, 'username': username, 'locked_at': timestamp}}}

@socketio.on('join_edit')
def handle_join(data):
    """处理用户加入编辑"""
    try:
        file_id = str(data.get('fileId'))
        user_id = str(data.get('userId'))
        username = data.get('username')
        share_code = data.get('shareCode')
        
        print(f"Checking permission for user {user_id} on file {file_id}")  # 调试日志
        
        # 检查权限
        if not permission_service.can_write(user_id, file_id, share_code):
            print(f"Permission denied for user {user_id} on file {file_id}")  # 调试日志
            emit('error', {'message': '没有编辑权限'})
            return
            
        print(f"Permission granted for user {user_id} on file {file_id}")  # 调试日志
        
        # 加入房间
        room = f'file_{file_id}'
        join_room(room)
        print(f"[WebSocket] 用户 {user_id} 加入房间 {room} (sid={request.sid})") #2025.5.14调试日志
        
        # 记录编辑者
        if file_id not in file_editors:
            file_editors[file_id] = {}
        file_editors[file_id][user_id] = {
            'username': username,
            'last_active': datetime.utcnow()
        }
        
        # 广播新用户加入
        emit('user_joined', {
            'userId': user_id,
            'username': username,
            'editors': {
                uid: data['username'] 
                for uid, data in file_editors[file_id].items()
            }
        }, room=room, namespace='/')
        print(f"[WebSocket] 向房间 {room} 广播 user_joined")  #2025.5.14新增日志
        
        # 发送当前文件数据
        if file_id in file_data:
            emit('sync_data', {
                'data': file_data[file_id]['cells']
            })
    except Exception as e:
        print(f"Error in handle_join: {str(e)}")  # 调试日志
        emit('error', {'message': f'加入编辑失败: {str(e)}'})

@socketio.on('leave_edit')
def handle_leave(data):
    """处理用户离开编辑"""
    file_id = str(data.get('fileId'))
    user_id = str(data.get('userId'))
    room = f'file_{file_id}'
    
    # 移除编辑者
    if file_id in file_editors and user_id in file_editors[file_id]:
        user_data = file_editors[file_id].pop(user_id)
        
        # 广播用户离开
        print(f"[WebSocket] 用户 {user_id} 离开房间 {room}") #2025.5.14调试日志
        emit('user_left', {
            'userId': user_id,
            'username': user_data['username'],
            'editors': {
                uid: data['username'] 
                for uid, data in file_editors[file_id].items()
            }
        }, room=room, namespace='/')
    
    leave_room(room)

@socketio.on('lock_cell')
def handle_lock_cell(data):
    """处理单元格锁定请求"""
    file_id = str(data.get('fileId'))
    user_id = str(data.get('userId'))
    cell = data.get('cell')
    share_code = data.get('shareCode')
    
    print(f"Locking cell {cell} for user {user_id} on file {file_id}")
    if not permission_service.can_write(user_id, file_id, share_code):
        emit('error', {'message': '没有编辑权限'})
        return
        
    room = f'file_{file_id}'
    cell_key = f"{cell['row']}_{cell['col']}"

    # 防止 KeyError 闪退
    if file_id not in file_editors or user_id not in file_editors[file_id]:
        print(f"[lock_cell] 用户 {user_id} 不在 file_editors 中，忽略锁定请求")
        return
    
    # 检查单元格是否已被锁定
    if file_id in cell_locks and cell_key in cell_locks[file_id]:
        lock_info = cell_locks[file_id][cell_key]
        # 如果是同一个用户，更新锁定时间
        if lock_info['user_id'] == user_id:
            lock_info['locked_at'] = datetime.utcnow()
            return
        # 如果是其他用户且锁定未超时，拒绝锁定
        if (datetime.utcnow() - lock_info['locked_at']).total_seconds() < 30:  # 30秒锁定超时
            emit('lock_rejected', {
                'cell': cell,
                'lockedBy': lock_info['username']
            })
            return
    
    # 创建新锁定
    if file_id not in cell_locks:
        cell_locks[file_id] = {}
    
    cell_locks[file_id][cell_key] = {
        'user_id': user_id,
        'username': file_editors[file_id][user_id]['username'],
        'locked_at': datetime.utcnow()
    }
    
    # 广播锁定状态
    print(f"[WebSocket] 广播 cell_updated 到 room={room}, 内容={data}") #2025.5.14新增调试日志
    emit('cell_locked', {
        'cell': cell,
        'userId': user_id,
        'username': file_editors[file_id][user_id]['username']
    }, room=room, namespace='/')

@socketio.on('unlock_cell')
def handle_unlock_cell(data):
    """处理单元格解锁请求"""
    file_id = str(data.get('fileId'))
    user_id = str(data.get('userId'))
    cell = data.get('cell')
    share_code = data.get('shareCode')
    
    room = f'file_{file_id}'
    cell_key = f"{cell['row']}_{cell['col']}"
    
    # 检查是否是锁定用户
    if (file_id in cell_locks and 
        cell_key in cell_locks[file_id] and 
        cell_locks[file_id][cell_key]['user_id'] == user_id):
        # 移除锁定
        del cell_locks[file_id][cell_key]
        
        # 广播解锁状态
        emit('cell_unlocked', {
            'cell': cell,
            'userId': user_id
        }, room=room, namespace='/')

@socketio.on('cell_updated')
def handle_cell_updated(data):
    """处理单元格更新"""
    try:
        file_id = data.get('fileId')
        user_id = data.get('userId')
        share_code = data.get('shareCode')
        sheet_name = data.get('sheetName')
        row = data.get('row')
        col = data.get('col')
        value = data.get('value')
        all_data = data.get('allData')
        
        print(f"Received cell_updated event: {data}")  # 添加事件数据日志
        print(f"Room: file_{file_id}")  # 添加房间信息日志
        
        # 检查权限
        has_permission = permission_service.can_write(user_id, file_id, share_code)
        print(f"Write permission check result: {has_permission}")  # 添加权限检查日志
            
        if not has_permission:
            print(f"No write permission for user {user_id}")  # 添加权限拒绝日志
            emit('error', {'message': '没有编辑权限'})
            return
            
        print(f"Cell update authorized for user {user_id}")  # 添加授权日志
        
        # 获取房间中的用户数量
        room = f'file_{file_id}'
        room_size = len(socketio.server.manager.rooms.get(f'/{room}', {}))
        print(f"Room {room} has {room_size} connected clients")  # 添加房间状态日志

        # 初始化file_data[file_id]结构
        if file_id not in file_data:
            file_data[file_id] = {
                'cells': {},           # 缓存每个 cell 的值
                'last_updated': datetime.utcnow(),
                'sheets': {}           # 缓存完整 sheet 结构
            }

        # 写入单个cell值到缓存
        cell_key = f"{sheet_name}_{row}_{col}"
        file_data[file_id]['cells'][cell_key] = value
        file_data[file_id]['last_updated'] = datetime.utcnow()

        # latest缓存整张表的结构
        file_data[file_id]['sheets'][sheet_name] = all_data
        
        # 广播更新给其他用户
        emit('cell_updated', {
            'userId': user_id,
            'sheetName': sheet_name,
            'row': row,
            'col': col,
            'value': value,
            'allData': all_data
        }, room=f'file_{file_id}', include_self=False)
        
        print(f"Broadcasted cell update to room file_{file_id}")  # 添加广播日志
        
        # 记录编辑操作
        file_service.log_operation(
            user_id=user_id,
            file_id=file_id,
            operation_type='edit_cell',
            operation_detail=f'编辑单元格：行{row}列{col}'
        )
        
    except Exception as e:
        print(f"Error in handle_cell_updated: {str(e)}")  # 添加错误日志
        emit('error', {'message': str(e)})

@socketio.on('sync_data')
def handle_sync_data(data):
    """处理前端全局广播的完整数据同步请求"""
    try:
        file_id = str(data.get('fileId'))
        user_id = str(data.get('userId'))
        share_code = data.get('shareCode')
        updated_data = data.get('data')

        room = f'file_{file_id}'
        print(f"[sync_data] from user {user_id} broadcasting to room: {room}")

        # 如果数据为空，跳过处理
        if updated_data is None:
            print(f"[sync_data] 收到空数据，跳过缓存更新 file_id={file_id}")
            return

        # 初始化缓存结构
        if file_id not in file_data:
            file_data[file_id] = {
                'cells': {},
                'last_updated': datetime.utcnow(),
                'sheets': {}
            }

        # 更新完整结构
        file_data[file_id]['sheets'] = updated_data
        file_data[file_id]['last_updated'] = datetime.utcnow()

        #  重构 flat cells 缓存，确保刷新后能使用 loadData 渲染
        flat_cells = {}
        for sheet_name, sheet in updated_data.items():
            rows = sheet.get('rows', {})
            for row_idx, row_data in rows.items():
                cells = row_data.get('cells', {})
                for col_idx, cell in cells.items():
                    cell_key = f"{sheet_name}_{row_idx}_{col_idx}"
                    flat_cells[cell_key] = cell.get('text', '')

        file_data[file_id]['cells'] = flat_cells  # 用于 refresh 后加载数据

        # 广播更新（给其他用户）
        emit('sync_data', {
            'data': updated_data,
            'fromUserId': user_id
        }, room=room, include_self=False)

    except Exception as e:
        print(f"Error in handle_sync_data: {str(e)}")
        emit('error', {'message': f'sync_data 广播失败: {str(e)}'})



@socketio.on('save_request')
def handle_save_request(data):
    """处理保存请求"""
    file_id = str(data.get('fileId'))
    user_id = str(data.get('userId'))
    share_code = data.get('shareCode')
    
    if not permission_service.can_write(user_id, file_id, share_code):
        emit('error', {'message': '没有保存权限'})
        return
        
    room = f'file_{file_id}'
    
    # 广播保存通知
    emit('save_notification', {
        'userId': user_id,
        'username': file_editors[file_id][user_id]['username']
    }, room=room, namespace='/')

@socketio.on('disconnect')
def handle_disconnect(sid):
    """处理连接断开"""
    print(f"[disconnect] SID: {sid}")
    for file_id in list(file_editors.keys()):
        for user_id in list(file_editors[file_id].keys()):
            # 使用Flask-SocketIO提供的sid判断逻辑改写（手动绑定不可靠）
            # 所以不判断sid，而是直接触发leave_edit
            handle_leave({
                'fileId': file_id,
                'userId': user_id
            })


# 定期清理不活跃的编辑者
def cleanup_inactive_editors():
    current_time = datetime.utcnow()
    for file_id in list(file_editors.keys()):
        for user_id in list(file_editors[file_id].keys()):
            last_active = file_editors[file_id][user_id]['last_active']
            if (current_time - last_active).total_seconds() > 300:  # 5分钟无活动
                handle_leave({
                    'fileId': file_id,
                    'userId': user_id
                })

# 定期清理过期的单元格锁定
def cleanup_expired_locks():
    current_time = datetime.utcnow()
    for file_id in list(cell_locks.keys()):
        for cell_key in list(cell_locks[file_id].keys()):
            lock_info = cell_locks[file_id][cell_key]
            if (current_time - lock_info['locked_at']).total_seconds() > 30:
                del cell_locks[file_id][cell_key]
                # 广播解锁状态
                emit('cell_unlocked', {
                    'cell': {
                        'row': int(cell_key.split('_')[0]),
                        'col': int(cell_key.split('_')[1])
                    },
                    'userId': lock_info['user_id']
                }, room=f'file_{file_id}')



# 设置定期清理任务
from apscheduler.schedulers.background import BackgroundScheduler
scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_inactive_editors, 'interval', minutes=5)
scheduler.add_job(cleanup_expired_locks, 'interval', seconds=30)
scheduler.start() 
