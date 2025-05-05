import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import FileList from './pages/FileList';
import FilePreview from './pages/FilePreview';
import FileEdit from './pages/FileEdit';
import UserLogs from './pages/UserLogs';
import AdminPanel from './pages/AdminPanel';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import { theme } from './theme';
import './styles/global.css';
import Preview from './pages/Preview';
import ShareList from './components/ShareList';
import ShareView from './pages/ShareView';

const { Content } = Layout;

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Layout style={{ minHeight: '100vh' }}>
            <Navbar />
            <Content style={{ padding: '0 50px', marginTop: 64 }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Preview />
                      </Layout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/files"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <FileList />
                      </Layout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/preview/:fileId"
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Preview />
                      </Layout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/edit/:fileId"
                  element={
                    <PrivateRoute>
                      <FileEdit />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/logs"
                  element={
                    <PrivateRoute>
                      <UserLogs />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <PrivateRoute adminOnly>
                      <AdminPanel />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/shares"
                  element={
                    <PrivateRoute>
                      <ShareList />
                    </PrivateRoute>
                  }
                />
                <Route path="/shares/:shareCode" element={<ShareView />} />
              </Routes>
            </Content>
          </Layout>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App; 
