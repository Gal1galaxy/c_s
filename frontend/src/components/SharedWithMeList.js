import React, { useState, useEffect } from 'react';
import { List, Button, Tag, Space, message, Typography } from 'antd';
import { DownloadOutlined, EyeOutlined, FileOutlined } from '@ant-design/icons';
import { shareService } from '../services/shareService';
import { formatDate, getTimeLeft, isExpired } from '../utils/dateUtils';
import { formatFileSize } from '../utils/fileUtils';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;
//新增2025.5.5
const handleCopyLink = (shareCode) => {
  const link = `${window.location.origin}/shares/${shareCode}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link)
      .then(() => {
        message.success('分享链接已复制到剪贴板');
      })
      .catch((err) => {
        console.error('Clipboard API not available, falling back', err);
        fallbackCopyTextToClipboard(link);
      });
  } else {
    fallbackCopyTextToClipboard(link);
  }
};

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      message.success('分享链接已复制到剪贴板');
    } else {
      message.error('复制失败，请手动复制');
    }
  } catch (err) {
    console.error('Fallback copy failed', err);
    message.error('复制失败，请手动复制');
  }

  document.body.removeChild(textArea);
}

const SharedWithMeList = () => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadShares = async () => {
    try {
      setLoading(true);
      const data = await shareService.getShares();
      setShares(data.receivedShares);
    } catch (error) {
      message.error('加载分享列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  const handlePreview = (fileId) => {
    navigate(`/preview/${fileId}`);
  };

  return (
    <List
      loading={loading}
      dataSource={shares}
      renderItem={(share) => (
        <List.Item
          actions={[
            <Button
              icon={<EyeOutlined />}
              onClick={() => {       //更改2025.5.4，解决分享问题，做判空处理，保护 share.file。初始代码onClick={() => handlePreview(share.file.id)}
                if (share?.file?.id) handlePreview(share.file.id);
                else message.error('文件信息缺失，无法预览');
            }}
            >
              预览
            </Button>,
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {/* 后续完善实现下载功能 */}}
            >
              下载
            </Button>,
            <Button
               onClick={() => handleCopyLink(share.shareCode)}
            >
               复制链接
            </Button>
          ]}
        >
          <List.Item.Meta
            avatar={<FileOutlined style={{ fontSize: 24 }} />}
            title={share?.file?.filename || '未知文件'}//更改2025.5.4做判空处理，保护 share.file..初始代码：title={share.file.filename}
            description={
              <Space direction="vertical">
                <Space>
                  {share.canWrite ? (
                    <Tag color="green">可编辑</Tag>
                  ) : (
                    <Tag color="blue">只读</Tag>
                  )}
                  {share.expiresAt && (
                    <Tag color={isExpired(share.expiresAt) ? 'red' : 'orange'}>
                      {isExpired(share.expiresAt) ? '已过期' : `剩余：${getTimeLeft(share.expiresAt)}`}
                    </Tag>
                  )}
                  <Tag>{formatFileSize(share.file.file_size)}</Tag>
                </Space>
                <Text type="secondary">
                  分享时间：{formatDate(share.createdAt)}
                </Text>
                <Text type="secondary">
                  分享自：用户 {share.sharedBy}
                </Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );
};

export default SharedWithMeList; 
