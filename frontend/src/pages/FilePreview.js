import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Spin, message, Typography, Result, } from 'antd';
import axios from 'axios';
import ImagePreview from '../components/previews/ImagePreview';
import PDFPreview from '../components/previews/PDFPreview';
import TextPreview from '../components/previews/TextPreview';
import ExcelPreview from '../components/previews/ExcelPreview';
import WordPreview from '../components/previews/WordPreview';

const { Title, Text } = Typography;

const FilePreview = () => {
  const { fileId } = useParams();
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await axios.get(`/api/files/preview/${fileId}`);
        if (response.data.success) {
          setPreviewData(response.data.preview);
        } else {
          message.error(response.data.error || '预览失败');
        }
      } catch (error) {
        message.error('获取预览数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [fileId]);

  const renderPreview = () => {
    if (!previewData) {
      return (
        <Result
          status="warning"
          title="预览不可用"
          subTitle="无法加载该文件的预览内容"
        />
      );
    }

    switch (previewData.type) {
      case 'image':
        return <ImagePreview data={previewData} />;
      case 'pdf':
        return <PDFPreview data={previewData} />;
      case 'text':
        return <TextPreview data={previewData} />;
      case 'excel':
        return <ExcelPreview data={previewData} />;
      case 'word':
        return <WordPreview data={previewData} />;
      default:
        return <div>不支持的文件类型</div>;
    }
  };

    return (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: '0 16px' }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          padding: '16px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>文件预览</Title>
          <Text type="secondary">查看上传文件的内容和格式</Text>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          renderPreview()
        )}
      </Card>
    </div>
  );
};

/*############og code#############
  return (
    <Card title="文件预览">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : (
        renderPreview()
      )}
    </Card>
  );
};
############og code#############*/
export default FilePreview; 
