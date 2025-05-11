import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      console.log('Login attempt with:', values);  // 调试日志
      await login(values.username, values.password);
      message.success('登录成功');
      //#############2025.5.1更改直接跳转到文件目录#############
      // 重定向到之前的页面或首页
      const from = location.state?.from?.pathname || '/files';
      navigate('/files', { replace: true });
      //#############2025.5.1更改直接跳转到文件目录#############
      /*##########初始代码##########
      // 重定向到之前的页面或首页
      const from = location.state?.from?.pathname || '/files';
      navigate(from, { replace: true });
      ##########初始代码##########*/
    } catch (error) {
      console.error('Login error:', error);  // 调试日志
      message.error(error.error || '登录失败');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f7fa',
        padding: '24px'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>登录到您的账户</Title>
          <Text type="secondary">欢迎回来！</Text>
        </div>

        <Form name="login" layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text>还没有账号？</Text>{' '}
            <Link to="/register">立即注册</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};
/*##########初始代码##########
  return (
    <div style={{ maxWidth: 400, margin: '100px auto' }}>
      <Card title="登录">
        <Form
          name="login"
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            还没有账号？ <Link to="/register">立即注册</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};
                  ##########初始代码##########*/

export default Login; 
