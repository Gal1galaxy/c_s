import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, Typography, message, Spin, Divider } from 'antd';
import { DownloadOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { shareService } from '../services/shareService';
import { formatDate, getTimeLeft, isExpired } from '../utils/dateUtils';
import { formatFileSize } from '../utils/fileUtils';
import axios from 'axios';

const { Title, Text } = Typography;

const ShareView = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const [shareInfo, setShareInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShareInfo();
  }, [shareCode]);

  const loadShareInfo = async () => {
    try {
      setLoading(true);
      const response = await shareService.getShareInfo(shareCode);
      console.log('后端返回的完整response:', response); // 调试日志
      
      if (response?.share?.file?.id) {
        setShareInfo(response.share);
      } else {
        message.error('获取分享信息失败');
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading share info:', error); // 调试日志
      message.error(error.response?.data?.error || '获取分享信息失败');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (shareInfo?.file?.id) {
      console.log('Previewing file:', shareInfo.file.id, 'shareCode:', shareCode); // 调试日志
      navigate(`/preview/${shareInfo.file.id}?shareCode=${shareCode}`);
    } else {
      message.error('文件信息不完整');
    }
  };

  const handleEdit = () => {
    if (shareInfo?.file?.id) {
      navigate(`/edit/${shareInfo.file.id}?shareCode=${shareCode}`);
    } else {
      message.error('文件信息不完整');
    }
  };

  const handleDownload = async () => {
    if (!shareInfo?.file?.id) {
      message.error('文件信息不完整');
      return;
    }

    try {
      const response = await axios.get(
        `/api/files/download/${shareInfo.file.id}`, 
        {
          params: { shareCode },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', shareInfo.file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('下载失败');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!shareInfo) {
    return null;
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              {shareInfo.file.filename}
            </Title>
            <Space wrap>
              {shareInfo.canWrite ? (
                <Tag color="green">可编辑</Tag>
              ) : (
                <Tag color="blue">只读</Tag>
              )}
              {shareInfo.expiresAt && (
                <Tag color={isExpired(shareInfo.expiresAt) ? 'red' : 'orange'}>
                  {isExpired(shareInfo.expiresAt) ? '已过期' : `剩余：${getTimeLeft(shareInfo.expiresAt)}`}
                </Tag>
              )}
              <Tag>{formatFileSize(shareInfo.file.file_size)}</Tag>
            </Space>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <Text type="secondary">分享者：用户 {shareInfo.sharedBy}</Text><br />
            <Text type="secondary">分享时间：{formatDate(shareInfo.createdAt)}</Text>
          </div>

          <Space style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={shareInfo.canWrite ? <EditOutlined /> : <EyeOutlined />}
              onClick={handlePreview}
            >
              {shareInfo.canWrite ? '编辑' : '预览'}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownload}
            >
              下载
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default ShareView; 
