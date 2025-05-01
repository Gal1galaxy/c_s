import React, { useState } from 'react';
import { Table, Button, Space, Modal } from 'antd';
import { DownloadOutlined, DeleteOutlined, EyeOutlined, ShareAltOutlined } from '@ant-design/icons';
import FilePreview from './FilePreview';
import axios from 'axios';

const FileList = ({ files, onDelete, onShare }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async (file) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/files/${file.id}/content`);
      setPreviewFile(response.data);
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error fetching file content:', error);
      message.error('获取文件内容失败');
    } finally {
      setLoading(false);
    }
  };
  ########新增2025.5.1新的文件下载逻辑########
  ########更改下载按钮逻辑：用 axios 带上 token，后端返回 blob，再触发浏览器下载
  const handleDownload = async (file) => {
    try {
      const response = await axios.get(`/api/files/download/${file.id}`, {
        responseType: 'blob'  // 返回文件流
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);  // 设置文件名
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
      message.error('下载文件失败');
    }
  };
 ######新增2025.5.1新的文件下载逻辑########

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          {record.can_preview && (
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => handlePreview(record)}
              loading={loading}
            >
              预览
            </Button>
          )}
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => window.open(`/api/files/download/${record.id}`)}
          >
            下载
          </Button>
          <Button 
            icon={<ShareAltOutlined />} 
            onClick={() => onShare(record)}
          >
            分享
          </Button>
          <Button 
            icon={<DeleteOutlined />} 
            danger 
            onClick={() => onDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table 
        columns={columns} 
        dataSource={files} 
        rowKey="id"
      />
      <Modal
        title="文件预览"
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewFile(null);
        }}
        width={800}
        footer={null}
      >
        <FilePreview fileData={previewFile} />
      </Modal>
    </>
  );
};

export default FileList; 
