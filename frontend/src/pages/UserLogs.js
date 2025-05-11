import React, { useState, useEffect } from 'react';
import { Table, Card, Select, DatePicker, Space, Tag, Typography } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

const UserLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    dateRange: null,
    action: null
  });

  const fetchLogs = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      let url = `/api/logs/user/${user.id}/operations?page=${page}&per_page=${pageSize}`;

      if (filters.dateRange) {
        url += `&start_date=${filters.dateRange[0].format('YYYY-MM-DDTHH:mm:ss')}`;
        url += `&end_date=${filters.dateRange[1].format('YYYY-MM-DDTHH:mm:ss')}`;
      }
      if (filters.action) {
        url += `&action=${filters.action}`;
      }

      const response = await axios.get(url);
      setLogs(response.data.logs);
      setPagination({
        current: page,
        pageSize,
        total: response.data.total
      });
    } catch (error) {
      console.error('获取日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, pagination.pageSize);
  }, [filters]);

  const handleTableChange = (pagination) => {
    fetchLogs(pagination.current, pagination.pageSize);
  };

  const columns = [
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => moment.utc(text).local().format('YYYY-MM-DD HH:mm:ss'),
      width: 180,
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation_type',
      width: 120,
      render: (action) => {
        let color = 'blue';
        switch (action) {
          case 'upload': color = 'green'; break;
          case 'delete': color = 'red'; break;
          case 'share': color = 'purple'; break;
          case 'edit': color = 'orange'; break;
          case 'download': color = 'cyan'; break;
          default: color = 'blue';
        }
        return <Tag color={color}>{action}</Tag>;
      },
    },
    {
      title: '资源ID',
      dataIndex: 'file_id',
      key: 'file_id',
      width: 80,
    },
    {
      title: '详情',
      dataIndex: 'operation_detail',
      key: 'operation_detail',
      render: (details) => {
        if (!details) return '-';
        return typeof details === 'string' ? details : JSON.stringify(details);
      },
    }
  ];

  const actionOptions = [
    { label: '上传', value: 'upload' },
    { label: '下载', value: 'download' },
    { label: '删除', value: 'delete' },
    { label: '分享', value: 'share' },
    { label: '编辑', value: 'edit' }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '40px auto', padding: '0 16px' }}>
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ margin: 0 }}>操作日志</Title>}
        extra={
          <Space size="middle" wrap>
            <RangePicker
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
              style={{ width: 250 }}
              placeholder={['开始日期', '结束日期']}
            />
            <Select
              allowClear
              placeholder="选择操作类型"
              onChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
              style={{ width: 180 }}
            >
              {actionOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default UserLogs;
