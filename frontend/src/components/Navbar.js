import React from 'react';
import { Layout, Menu } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FileOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  ShareAltOutlined
} from '@ant-design/icons';

const { Header } = Layout;
const { Item, ItemGroup, SubMenu } = Menu;

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    //##############新增2025.5.1在 logout() 后，彻底清理localStorage，并且跳转到/login，确保彻底登出。##############
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    //##############新增2025.5.1在 logout() 后，彻底清理localStorage，并且跳转到/login，确保彻底登出。##############
    navigate('/login');
  };

  const menuItems = [
    {
      key: 'shares',
      icon: <ShareAltOutlined />,
      label: <Link to="/shares">分享管理</Link>
    }
  ];

  return (
    <Header>
      <div style={{ float: 'left', color: 'white', marginRight: '20px' }}>
        云存储系统
      </div>
      <Menu theme="dark" mode="horizontal" selectedKeys={[window.location.pathname]}>
        <Item key="/" icon={<FileOutlined />}>
          <Link to="/files">文件</Link>
        </Item>
        <Item key="/logs" icon={<FileOutlined />}>
          <Link to="/logs">日志</Link>
        </Item>
        {user.role === 'admin' && (
          <Item key="/admin" icon={<SettingOutlined />}>
            <Link to="/admin">管理</Link>
          </Item>
        )}
        <Item key="shares" icon={<ShareAltOutlined />}>
          <Link to="/shares">分享管理</Link>
        </Item>
        <SubMenu
          key="user"
          icon={<UserOutlined />}
          title={user.username}
          style={{ marginLeft: 'auto' }}
        >
          <Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
            退出
          </Item>
        </SubMenu>
      </Menu>
    </Header>
  );
};

export default Navbar; 
