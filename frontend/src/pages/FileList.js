import React, { useState, useEffect } from 'react';
import { Table, Space, Button, message, Card, Typography, Row, Col, Statistic } from 'antd';
import { DeleteOutlined, DownloadOutlined, EyeOutlined, CloudUploadOutlined, FileOutlined, EditOutlined, ShareAltOutlined } from '@ant-design/icons';
//import axios from 'axios';
import api from '../services/api'; //增加 解决首页按钮问题
import FileUpload from '../components/FileUpload';
import { useNavigate } from 'react-router-dom';
import ShareFileModal from '../components/ShareFileModal';

const { Title } = Typography;

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0
  });
  const navigate = useNavigate();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      //2025.5.11注释掉，改为下行const response = await axios.get('/api/files/list');
      const response = await api.get('/api/files/list');
      const files = response.data.owned_files;
      setFiles(files);
      
      // 计算统计信息
      const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);
      setStats({
        totalFiles: files.length,
        totalSize: totalSize
      });
    } catch (error) {
      console.error('Error fetching files:', error);
      message.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // 删除文件
  const handleDelete = async (fileId) => {
    try {
      //2025.5.11注释掉改为下行await axios.delete(`/api/files/${fileId}`);
      await api.delete(`/api/files/${fileId}`);
      message.success('文件删除成功');
      fetchFiles();
    } catch (error) {
      message.error('文件删除失败');
    }
  };

  // 下载文件
  const handleDownload = async (fileId, filename) => {
    try {
      const response = await api.get(`/api/files/download/${fileId}`, {
        responseType: 'blob'
      });
      /* 注释掉改为上面
      const response = await axios.get(`/api/files/download/${fileId}`, {
        responseType: 'blob'
      });*/
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      message.error('文件下载失败');
    }
  };

  // 预览文件
  const handlePreview = (fileId) => {
    navigate(`/preview/${fileId}`);
  };

  const handleShare = (file) => {
    setSelectedFile(file);
    setShareModalVisible(true);
  };

  const getFileTypeDisplay = (fileType, filename) => {
    // 首先检查文件扩展名
    const extension = filename.split('.').pop().toLowerCase();
    const typeMap = {
      'excel': 'Excel',
      'spreadsheet': 'Excel',
      'word': 'Word',
      'pdf': 'PDF',
      'text': '文本文件',
      'image': '图片',
      'video': '视频',
      'audio': '音频',
    };
    
    // 检查文件类型中是否包含已知类型
    for (const [key, value] of Object.entries(typeMap)) {
      if (fileType.toLowerCase().includes(key)) {
        return value;
      }
    }
    
    // 如果文件类型没有匹配，检查扩展名
    const extensionMap = {
      'xlsx': 'Excel',
      'xls': 'Excel',
      'doc': 'Word',
      'docx': 'Word',
      'pdf': 'PDF',
      'txt': '文本文件',
      'jpg': '图片',
      'jpeg': '图片',
      'png': '图片',
      'gif': '图片',
      'mp4': '视频',
      'mp3': '音频',
      'zip': '压缩文件',
      'rar': '压缩文件',
      '7z': '压缩文件',
    };
    
    return extensionMap[extension] || '其他文件';
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (text, record) => (
        <Space>
          <FileOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 150,
      render: (text, record) => getFileTypeDisplay(text, record.filename),
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 120,
      render: (size) => {
        const kb = size / 1024;
        if (kb < 1024) {
          return `${kb.toFixed(2)} KB`;
        }
        const mb = kb / 1024;
        return `${mb.toFixed(2)} MB`;
      },
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 360,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          {(record.file_type.includes('excel') || 
            record.file_type.includes('spreadsheet') || 
            record.filename.match(/\.(xlsx|xls)$/i)) && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handlePreview(record.id)}
            >
              编辑
            </Button>
          )}
          {(record.filename.match(/\.(docx|doc)$/i) || 
            record.filename.match(/\.(pdf)$/i) || 
            record.filename.match(/\.(jpg)$/i) || 
            record.filename.match(/\.(png)$/i) || 
            record.filename.match(/\.(txt)$/i)) && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record.id)}
            >
              预览
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.id, record.filename)}
          >
            下载
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
          <Button
            icon={<ShareAltOutlined />}
            onClick={() => handleShare(record)}
          >
            分享
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card bordered={false}>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Title level={4} style={{ margin: 0, marginBottom: '24px' }}>我的文件</Title>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="文件总数"
                value={stats.totalFiles}
                prefix={<FileOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="存储空间"
                value={(stats.totalSize / (1024 * 1024)).toFixed(2)}
                suffix="MB"
                prefix={<CloudUploadOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card 
        bordered={false}
        style={{ marginTop: '24px' }}
        title={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '1px 0'
          }}>
            <span>文件列表</span>
            <FileUpload onSuccess={() => fetchFiles()} />
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={files}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个文件`,
            showQuickJumper: true,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <ShareFileModal
        file={selectedFile}
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onSuccess={() => {
          message.success('分享成功');
          fetchFiles();
        }}
      />
    </div>
  );
};

export default FileList; 
