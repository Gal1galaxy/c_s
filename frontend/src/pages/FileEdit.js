import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Card, Button, message, Space, Badge, Typography,  } from 'antd';
import { SaveOutlined, UserOutlined } from '@ant-design/icons';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const FileEdit = () => {
  const { fileId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 初始化WebSocket连接
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      query: { fileId, userId: user.id }
    });

    newSocket.on('connected', () => {
      console.log('WebSocket connected');
      // 加入编辑会话
      newSocket.emit('join_edit', { file_id: fileId, user_id: user.id });
    });

    newSocket.on('file_content', (data) => {
      if (data.content) {
        setData(data.content);
        if (data.content.length > 0) {
          setColumns(Object.keys(data.content[0]).map(key => ({
            title: key,
            dataIndex: key,
            key,
            editable: true,
            onCell: record => ({
              record,
              editable: true,
              dataIndex: key,
              title: key,
              handleSave: handleSave,
            })
          })));
        }
        setLoading(false);
      }
    });

    newSocket.on('cell_updated', (update) => {
      setData(prevData => {
        const newData = [...prevData];
        newData[update.row][update.col] = update.value;
        return newData;
      });
    });

    newSocket.on('user_joined', (data) => {
      setActiveUsers(data.active_users);
      message.info(`用户 ${data.user_id} 加入编辑`);
    });

    newSocket.on('user_left', (data) => {
      setActiveUsers(data.active_users);
      message.info(`用户 ${data.user_id} 离开编辑`);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave_edit', { file_id: fileId, user_id: user.id });
        newSocket.disconnect();
      }
    };
  }, [fileId, user.id]);

  // 处理单元格编辑
  const handleSave = useCallback((row, col, value) => {
    if (socket) {
      socket.emit('cell_update', {
        file_id: fileId,
        user_id: user.id,
        row,
        col,
        value
      });
    }
  }, [socket, fileId, user.id]);

  // 保存文件
  const handleSaveFile = () => {
    if (socket) {
      socket.emit('save_file', {
        file_id: fileId,
        user_id: user.id
      });
      message.success('文件保存成功');
    }
  };

  const EditableCell = ({
    editable,
    children,
    record,
    dataIndex,
    handleSave,
    ...restProps
  }) => {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(children);

    const toggleEdit = () => {
      setEditing(!editing);
      setValue(children);
    };

    const save = () => {
      const row = data.findIndex(item => item === record);
      handleSave(row, dataIndex, value);
      toggleEdit();
    };

    if (!editing) {
      return (
        <td {...restProps} onDoubleClick={toggleEdit}>
          {children}
        </td>
      );
    }

    return (
      <td {...restProps}>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={save}
          onPressEnter={save}
          autoFocus
        />
      </td>
    );
  };

  const components = {
    body: {
      cell: EditableCell,
    },
  };

    return (
      <td {...restProps}>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          autoFocus
        />
      </td>
    );
  };

  const components = {
    body: {
      cell: EditableCell,
    },
  };

  return (
    <div style={{ maxWidth: 1200, margin: '40px auto', padding: '0 16px' }}>
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>在线协作编辑</Title>
              <Text type="secondary">Excel 文件内容实时共享编辑</Text>
            </div>
            <Space>
              <Badge count={activeUsers.length} offset={[0, 6]}>
                <UserOutlined style={{ fontSize: 16 }} />
              </Badge>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveFile}
              >
                保存
              </Button>
            </Space>
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <Table
            components={components}
            rowClassName={() => 'editable-row'}
            bordered
            dataSource={data}
            columns={columns}
            loading={loading}
            pagination={false}
            scroll={{ x: true }}
            size="small"
          />
        </div>
      </Card>
    </div>
  );
};
/*################og code####################
  return (
    <Card
      title="在线编辑"
      extra={
        <Space>
          <span>
            <UserOutlined /> 在线用户: {activeUsers.length}
          </span>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveFile}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Table
        components={components}
        rowClassName={() => 'editable-row'}
        bordered
        dataSource={data}
        columns={columns}
        loading={loading}
        pagination={false}
        scroll={{ x: true, y: 'calc(100vh - 300px)' }}
      />
    </Card>
  );
};
################og code####################*/

export default FileEdit; 
