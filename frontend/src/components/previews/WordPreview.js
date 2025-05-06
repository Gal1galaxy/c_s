//#################2025.5.6重构代码################
import React from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

const WordPreview = ({ data }) => {
  console.log('WordPreview 接收到的 data:', data);

  if (!data || !data.content) {
    return <div>没有内容可预览</div>;
  }

  const paragraphs = Array.isArray(data.content) ? data.content : data.content.split('\n');

  return (
    <div style={{ padding: '20px' }}>
      {paragraphs.map((paragraph, index) => (
        <Paragraph key={index}>
          {typeof paragraph === 'string' ? paragraph : paragraph.text || JSON.stringify(paragraph)}
        </Paragraph>
      ))}
    </div>
  );
};

export default WordPreview;


/*###########初始代码###########
import React from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

const WordPreview = ({ data }) => {
  return (
    <div style={{ padding: '20px' }}>
      {data.content.map((paragraph, index) => (
        <Paragraph key={index}>
          {paragraph}
        </Paragraph>
      ))}
    </div>
  );
};

export default WordPreview; 
###########初始代码###########*/
