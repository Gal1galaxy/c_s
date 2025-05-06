import React, { useState } from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const FileUpload = ({ onSuccess }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'        //新增2025.5.6 axios.post加上请求头
        }
      });
      message.success('文件上传成功');
      onSuccess?.();
    } catch (error) {
      if (error.response?.data?.error?.includes('已存在同名文件')) {
        message.error('已存在同名文件，请重命名后再上传');
      } else {
        message.error('上传失败');
      }
    }
  };

  return (
    <Upload
      customRequest={({ file }) => handleUpload(file)}
      showUploadList={false}
    >
      <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
        上传文件
      </Button>
    </Upload>
  );
};

export default FileUpload; 
