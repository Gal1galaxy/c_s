import axios from 'axios';

export const shareService = {
  // 创建分享
  createShare: async (fileId, data) => {
    const response = await axios.post('/api/shares/create', {
      fileId,
      ...data
    });
    return response.data;
  },

  // 获取分享列表
  getShares: async () => {
    const response = await axios.get('/api/shares/list');
    return response.data;
  },

  // 撤销分享
  revokeShare: async (shareId) => {
    const response = await axios.delete(`/api/shares/revoke/${shareId}`);
    return response.data;
  },

  // 获取分享信息
  async getShareInfo(shareCode) {
    try {
      const token = localStorage.getItem('token'); // 从本地存储取出JWT
      const response = await axios.get(`/api/shares/${shareCode}`,{
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}; 
