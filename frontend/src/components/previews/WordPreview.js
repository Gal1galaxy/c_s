//#################2025.5.6重构代码################
import React from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

const WordPreview = ({ data }) => {
  if (!data || !data.content) {
    return <div style={{ padding: '20px' }}>没有内容可预览</div>;
  }

  // 如果 content 是字符串，则按换行符分割成数组
  const paragraphs = typeof data.content === 'string'
    ? data.content.split('\n')
    : data.content;

  return (
    <div style={{ padding: '20px' }}>
      {paragraphs.map((paragraph, index) => (
        <Paragraph key={index}>
          {paragraph}
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
