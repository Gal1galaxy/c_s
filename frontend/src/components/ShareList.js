import React, { useState, useEffect } from 'react';
import { List, Card, Button, Tag, Space, Popconfirm, message, Typography } from 'antd';
import { ShareAltOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { shareService } from '../services/shareService';
import { formatDate, getTimeLeft, isExpired } from '../utils/dateUtils';

const { Text, Paragraph } = Typography;

const ShareList = () => {
  const [shares, setShares] = useState({ sharedFiles: [], receivedShares: [] });
  const [loading, setLoading] = useState(false);

  const loadShares = async () => {
    try {
      setLoading(true);
      const data = await shareService.getShares();
      setShares(data);
    } catch (error) {
      message.error('加载分享列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  const handleRevoke = async (shareId) => {
    try {
      await shareService.revokeShare(shareId);
      message.success('已撤销分享');
      loadShares();
    } catch (error) {
      message.error('撤销分享失败');
    }
  };

  //####################2025.5.5重构复制链接####################
const copyShareLink = async (shareCode) => {
  const link = `${window.location.origin}/shares/${shareCode}`;
  
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link);
      message.success('分享链接已复制到剪贴板');
    } else {
      // 兼容不支持navigator.clipboard 的情况
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed'; // 防止页面跳动
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('分享链接已复制到剪贴板');
    }
  } catch (error) {
    console.error('复制失败:', error);
    message.error('复制失败，请手动复制链接');
  }
};
  //####################2025.5.5重构复制链接####################
  /*##########初始代码##########
  const copyShareLink = (shareCode) => {
    const link = `${window.location.origin}/share/${shareCode}`;
    navigator.clipboard.writeText(link);
    message.success('分享链接已复制到剪贴板');
  };
  ##########初始代码##########*/

  const renderShareItem = (share, isSharedByMe) => (
    <List.Item
      actions={[
        <Button
          icon={<CopyOutlined />}
          onClick={() => copyShareLink(share.shareCode)}
        >
          复制链接
        </Button>,
        isSharedByMe && (
          <Popconfirm
            title="确定要撤销此分享吗？"
            onConfirm={() => handleRevoke(share.id)}
          >
            <Button icon={<DeleteOutlined />} danger>
              撤销
            </Button>
          </Popconfirm>
        )
      ].filter(Boolean)}
    >
      <List.Item.Meta
        title={share.file.filename}
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
            </Space>
            <Text type="secondary">
              创建时间：{formatDate(share.createdAt)}
            </Text>
            <Paragraph copyable={{ text: share.shareCode }}>
              分享码：{share.shareCode}
            </Paragraph>
          </Space>
        }
      />
    </List.Item>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card title="我的分享" loading={loading}>
        <List
          dataSource={shares.sharedFiles}
          renderItem={(share) => renderShareItem(share, true)}
        />
      </Card>
      
      <Card title="收到的分享" style={{ marginTop: '24px' }} loading={loading}>
        <List
          dataSource={shares.receivedShares}
          renderItem={(share) => renderShareItem(share, false)}
        />
      </Card>
    </div>
  );
};

export default ShareList; 
