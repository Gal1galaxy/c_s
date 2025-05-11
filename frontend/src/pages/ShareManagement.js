import React from 'react';
import { Tabs, Card, Typography } from 'antd';
import SharedByMeList from '../components/SharedByMeList';
import SharedWithMeList from '../components/SharedWithMeList';

const { Title } = Typography;

const ShareManagement = () => {
  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: '0 16px' }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        }}
        title={
          <Title level={4} style={{ marginBottom: 0 }}>
            我的分享管理
          </Title>
        }
      >
        <Tabs
          defaultActiveKey="shared"
          items={[
            {
              key: 'shared',
              label: '我分享的文件',
              children: <SharedByMeList />
            },
            {
              key: 'received',
              label: '我收到的文件',
              children: <SharedWithMeList />
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default ShareManagement;
