from PIL import Image
import PyPDF2
from docx import Document
import pandas as pd
import io
import base64
from app.models.file import File
from app.services.file_service import FileService

class PreviewService:
    def __init__(self):
        self.file_service = FileService()
        
    def get_preview(self, file: File):
        """获取文件预览数据"""
        if not file:
            return None

        print(f"[DEBUG] File type to preview: {file.file_type}")
            
        # 获取解密后的文件路径
        file_path = self.file_service.get_decrypted_file_path(file)
        
        try:
            if file.file_type.startswith('image/'):
                return self._preview_image(file_path)
            elif file.file_type == 'application/pdf':
                return self._preview_pdf(file_path)
            elif file.file_type == 'text/plain':
                return self._preview_text(file_path)
            elif file.file_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return self._preview_excel(file_path)
            elif file.file_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return self._preview_word(file_path)
            else:
                return {'error': '不支持的文件类型'}
        except Exception as e:
            return {'error': f'预览失败: {str(e)}'}
            
    def _preview_image(self, file_path):
        """预览图片"""
        with Image.open(file_path) as img:
            # 调整图片大小
            max_size = (800, 800)
            img.thumbnail(max_size, Image.LANCZOS)
            
            # 转换为base64
            buffer = io.BytesIO()
            img.save(buffer, format=img.format)
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return {
                'file_type': 'image/jpeg',
                'type': 'image',
                'data': img_str,
                'width': img.width,
                'height': img.height
            }
            
    def _preview_pdf(self, file_path):
        """预览PDF"""
        with open(file_path, 'rb') as file:
            pdf = PyPDF2.PdfReader(file)
            pages = []
            
            for page in range(len(pdf.pages)):
                text = pdf.pages[page].extract_text()
                pages.append(text)
                
            return {
                'type': 'pdf',
                'pages': pages,
                'total_pages': len(pages)
            }
            
    def _preview_text(self, file_path):
        """预览文本文件"""
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            return {
                'file_type': 'text/plain',
                'type': 'text',
                'content': content
            }
            
    def _preview_excel(self, file_path):
        """预览Excel文件"""
        df = pd.read_excel(file_path)
        data = df.to_dict('records')
        columns = df.columns.tolist()
        
        return {
            'type': 'excel',
            'data': data,
            'columns': columns
        }
        
    def _preview_word(self, file_path):
        """预览Word文件"""
        doc = Document(file_path)
        content = []
        
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                content.append(paragraph.text)
        if not content:
            content.append('(无法识别Word文档内容)')
                
        return {
            'type': 'word',
            'content': '\n'.join(content)  # 把list连接成字符串
        } 
