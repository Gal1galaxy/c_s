import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// 设置 axios 默认配置
axios.defaults.baseURL = '/api';  // 使用相对路径配合nginx转发,把/api/ 转发到 127.0.0.1:5000 后端（2025年4月25日）//指向后端服务器

//axios.defaults.withCredentials = true;  // 2025.5.1注释掉：使用JWT，不用跨域的Cookie，避免 axios 在请求时乱带 cookie，导致 Flask 后端搞混认证// 允许跨域请求携带cookie

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 设置全局请求拦截器
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');
        console.log('Request interceptor - URL:', config.url);
        console.log('Request interceptor - Token:', token);
        
        if (token) {
          // 确保 token 格式正确
          if (!token.startsWith('Bearer ')) {
            config.headers.Authorization = `Bearer ${token}`;
          } else {
            config.headers.Authorization = token;
          }
        }
        console.log('Final request headers:', config.headers);
        return config;
      },
      error => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        console.error('Response error:', error.response);
        if (error.response?.status === 401) {
          console.log('Unauthorized error - clearing auth state');
          localStorage.removeItem('token');
          setUser(null);
          window.location.href = '/login';  // 2025.5.1<<== 新增,加强 response 拦截器,增加这行自动跳转到 /login
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);
  
  //###################更改2025.5.1改成带Authorization:Bearer token请求###################
  // 检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try{
        const response = await axios.get('/api/auth/profile', {
          headers:{
            Authorization: `Bearer ${token}`
          }
        });
        setUser(response.data.user);
      } catch(error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    }
    setLoading(false);
  };
  //###################更改2025.5.1改成带Authorization:Bearer token请求###################
/* ###################初始代码###################
  // 检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/auth/profile');
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    ###################初始代码###################*/

    checkAuth();
  }, []);
//#########################检查认证状态在这里结束#########################
  
  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });
      
      const { token, user } = response.data;
      
      // 保存令牌和用户信息
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // 设置全局默认请求头
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      setIsAuthenticated(true);
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 
