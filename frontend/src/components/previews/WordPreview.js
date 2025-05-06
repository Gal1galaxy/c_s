//#################2025.5.6重构代码################
import React from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

const WordPreview = ({ data }) => {
  console.log('WordPreview 接收到的 data:', data);  // ★调试打印！

  if (!data || !data.content) {
    return <div>没有内容可预览</div>; // 如果 content 是空的，显示一行字
  }

  const paragraphs = typeof data.content === 'string' 
    ? data.content.split('\n') 
    : data.content;  // 如果是字符串，切割成数组

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
