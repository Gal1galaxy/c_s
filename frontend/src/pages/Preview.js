import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Card, Spin, Result, Button, message} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ExcelEditor from '../components/ExcelEditor';
import WordEditor from '../components/WordEditor';
import axios from 'axios';
import PDFPreview from '../components/PDFPreview';

const Preview = () => {
  const { fileId } = useParams();
  const location = useLocation();
  const shareCode = new URLSearchParams(location.search).get('shareCode');
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFile();
  }, [fileId]);

  const loadFile = async () => {
    try {
      setLoading(true);
      console.log('Loading file:', fileId, 'shareCode:', shareCode);
      
      let response;
      if (shareCode) {
        // 通过分享码访问
        response = await axios.get(`/api/files/${fileId}/content`, {
          params: { shareCode }
        });
        console.log('File content response:', response.data);
        // 确保 response.data 包含所有必要的文件信息
        setFile(response.data);
      } else {
        // 直接访问需要先获取文件信息，再获取内容
        const fileInfoResponse = await axios.get(`/api/files/${fileId}`);
        const fileContentResponse = await axios.get(`/api/files/${fileId}/content`);
        
        // 合并文件信息和内容
        setFile({
          ...fileInfoResponse.data.file,
          content: fileContentResponse.data.content
        });
      }
    } catch (error) {
      console.error('Error loading file:', error);
      message.error(error.response?.data?.error || '加载文件失败');
    } finally {
      setLoading(false);
    }
  };

  const isExcelFile = (file) => {
    return (
      file.file_type?.includes('spreadsheet') ||
      file.file_type?.includes('excel') ||
      file.filename?.toLowerCase().match(/\.(xlsx|xls)$/i) ||
      file.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  };

  const renderPreview = () => {
    if (!file) {
      return (
        <Result
          status="404"
          title="文件不存在"
          subTitle="请确认文件是否已被删除"
          extra={<Button type="primary" onClick={() => navigate('/files')}>
              返回文件列表
            </Button>
          }
        />
      );
    }

    console.log('File file_type:', file.file_type);
    console.log('File file_size:', file["file_size"]);
    console.log('File content:', typeof(file));
    console.log('File info:', file); // 调试日志

    // 如果是 Excel 文件
  if (isExcelFile(file)) {
  return <ExcelEditor fileId={fileId} fileInfo={file} />;
  }


    // 如果是文本文件
    if (file.file_type?.startsWith('text/')) {return (<div style={{ whiteSpace: 'pre-wrap', padding: '16px' }}>
      {file.content}
    </div>
  );
}


    // 如果是图片
    if (file.file_type?.startsWith('image/')) {
  return (
    <div style={{ textAlign: 'center', padding: '16px' }}>
      <img 
        src={`data:${file.file_type};base64,${file.content}`}
        alt={file.filename}
        style={{ 
          maxWidth: '100%',
          maxHeight: '80vh',
          objectFit: 'contain'
        }}
      />
      <div style={{ marginTop: '8px', color: '#666' }}>
        {file.width && file.height && `${file.width} x ${file.height}`}
      </div>
    </div>
  );
}

    // 如果是 PDF 
    if (file.file_type === 'PDF') {
      return <PDFPreview fileInfo={file} />;
    }
    
    // 如果是 Word
    if (file.file_type?.toLowerCase() === 'word') {
  return (
    <div style={{ whiteSpace: 'pre-wrap', padding: '16px' }}>
      {file.content}
    </div>
  );
}

    
    // 其他文件类型
    return (
      <Result
        status="info"
        title="暂不支持此类文件的预览"
        subTitle={`文件类型: ${file.file_type}`}
        extra={
          <Button type="primary" onClick={() => navigate('/files')}>
            返回文件列表
          </Button>
        }
      />
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              type="link" 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/files')}
              style={{ marginRight: '8px', padding: 0 }}
            />
            {file?.filename || '文件预览'}
          </div>
        }
        bordered={false}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : (
          renderPreview()
        )}
      </Card>
    </div>
  );
};

export default Preview; 
