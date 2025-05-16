import React, { useEffect, useRef, useState } from 'react';
import Spreadsheet from 'x-data-spreadsheet';
import 'x-data-spreadsheet/dist/xspreadsheet.css';
import { Button, message, Space, Badge, Tooltip, Avatar } from 'antd';
import { SaveOutlined, DownloadOutlined, UserOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';


const ExcelEditor = ({ fileId, fileInfo }) => {
  const { user } = useAuth();
  const containerRef = useRef(null);
  const spreadsheetRef = useRef(null);
  const socketRef = useRef(null);
  const [editors, setEditors] = useState({});
  const [lockedCells, setLockedCells] = useState({});
  const [canWrite, setCanWrite] = useState(true);  // 添加编辑权限状态
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const shareCode = new URLSearchParams(location.search).get('shareCode');
  const [loading, setLoading] = useState(false);
  const [socketReady, setSocketReady] = useState(false);

  // 将 Excel 数据转换为 x-spreadsheet 格式
  const excelToData = (workbook) => {
    const result = {};
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      result[sheetName] = { name: sheetName, rows: {} };
      
      data.forEach((row, i) => {
        result[sheetName].rows[i] = { cells: {} };
        row.forEach((cell, j) => {
          if (cell !== null && cell !== undefined) {
            result[sheetName].rows[i].cells[j] = { text: cell.toString() };
          }
        });
      });
    });
    return result;
  };

  // 将 x-spreadsheet 数据转换回 Excel 格式
  const dataToExcel = (data) => {
    const workbook = XLSX.utils.book_new();
    Object.keys(data).forEach((sheetName) => {
      const sheetData = data[sheetName];
      const rows = [];
      Object.keys(sheetData.rows).forEach((rowKey) => {
        const row = [];
        const cells = sheetData.rows[rowKey].cells || {};
        Object.keys(cells).forEach((colKey) => {
          row[parseInt(colKey)] = cells[colKey].text || '';
        });
        rows[parseInt(rowKey)] = row;
      });
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    return workbook;
  };

  const loadExcelData = async () => {
    const response = await axios.get(`/api/files/${fileId}/content`, {
      params: { shareCode }
    });
    console.log('📦 接收到的后端数据:', response.data);
    try {
      setLoading(true);
      console.log('Loading file:', fileId, 'shareCode:', shareCode);
      
      console.log('Excel data response:', response.data);
      
      // 设置编辑权限
      const hasWritePermission = response.data.can_write;
      console.log('Setting initial write permission:', hasWritePermission);
      setCanWrite(!!hasWritePermission);
      
      if (response.data && response.data.content) {
        const sheetsData = response.data.content;
        const convertedData = {};
        
        // 处理每个工作表
        Object.keys(sheetsData).sort().forEach((sheetName) => {
          console.log('Processing sheet:', sheetName);
          const sheetContent = sheetsData[sheetName];
          
          if (Array.isArray(sheetContent)) {
            // 获取所有列名
            let columns = [];
            if (sheetContent.length > 0) {
              const headerRow = sheetContent[0];
              columns = Object.keys(headerRow);
            }
            
            // 创建工作表数据
            const rows = {};
            
            // 添加表头行
            rows[0] = {
              cells: columns.reduce((acc, col, index) => {
                acc[index] = { text: col };
                return acc;
              }, {})
            };
            
            // 添加数据行
            sheetContent.forEach((rowData, rowIndex) => {
              const cells = {};
              columns.forEach((col, colIndex) => {
                const value = rowData[col];
                cells[colIndex] = { 
                  text: (value === null || value === undefined || Number.isNaN(value))
                    ? ''
                    : value.toString()
                };
              });
              
              rows[rowIndex + 1] = { cells };
            });
            
            // 添加工作表
            convertedData[sheetName] = {
              name: sheetName,
              rows: rows,
              index: Object.keys(convertedData).length // 添加索引以保持顺序
            };
          } else {
            message.warning(`工作表 ${sheetName} 没有有效数据，但已加载空表结构`);
            convertedData.push({
              name: sheetName,
              rows: {
                0: { cells: {} }
              },
              index: Object.keys(convertedData).length
            });
          }
        });
        
        console.log('Converted data:', convertedData);
        
        if (Object.keys(convertedData).length > 0) {
          // 重新初始化电子表格
          if (spreadsheetRef.current) {
            spreadsheetRef.current.loadData(convertedData);
            // 切换到第一个工作表
            //spreadsheetRef.current.sheet.activeSheet = convertedData[0].name;
          }
          message.success('文件加载成功');
          setIsInitialLoadDone(true);
        } else {
          throw new Error('没有有效的工作表数据');
        }
      } else {
        console.error('Invalid data format:', response.data);
        throw new Error('文件格式不正确');
      }
    } catch (error) {
      console.error('Load Excel error:', error);
      message.error(error.response?.data?.error || '加载文件内容失败');
      if (error.response?.status === 403) {
        navigate('/files');  // 如果没有权限，返回文件列表
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // 获取所有工作表的数据
      const allData = spreadsheetRef.current.getData();
      console.log('All spreadsheet data:', allData);
      
      // 转换所有工作表的数据
      const sheetsContent = {};
      
      // 提取所有 sheet 内容
      Object.entries(allData).forEach(([index, sheetData]) => {
        const sheetName = sheetData.name;
        const rows = sheetData.rows || {};

        // 获取表头（列标题）来自第 0 行
        const headerRow = rows[0]?.cells || {};
        const headerKeys = Object.keys(headerRow).map(k => parseInt(k)).sort((a, b) => a - b);

        // 生成列索引 -> 表头名映射
        const headerDict = {};
        let hasRealHeader = false;
        
        headerKeys.forEach((colIndex) => {
          const cellText = headerRow[colIndex]?.text?.trim() || '';
          headerDict[colIndex.toString()] = cellText;
          const isInvalidHeader = /^(列\d+|Unnamed.*|\d+)$/.test(cellText);  //非法表头判断
          if (cellText !== '' && !isInvalidHeader) {
            hasRealHeader = true; // 如果有非数字表头，视为真实表头
          }
        });

        // 定义 content 数组
        const content = [];

        if (hasRealHeader) {
          content.push(headerDict); //合法表头才加入
        }   

        // 处理数据行:从第 1 行开始提取内容，遍历数据行
        Object.keys(rows).forEach((rowIndexStr) => {
          const ri = parseInt(rowIndexStr, 10);
          if (ri === 0) return;  // 跳过表头

          const row = rows[ri]?.cells || {};
          const rowData = {};
          headerKeys.forEach((colIndex) => {
            const headerKey = colIndex.toString();
            const cell = row[colIndex];
            rowData[headerKey] = row[colIndex]?.text || '';
          });

          content.push(rowData);
        });

        sheetsContent[sheetName] = content;
      });
      
      console.log('Saving content:', sheetsContent);
      
      const response = await axios.post(
        `/api/files/${fileId}/content${shareCode ? `?shareCode=${shareCode}` : ''}`,
        sheetsContent
      );
      
      if (response.data.message) {
        message.success('保存成功');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      message.error(error.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加单元格编辑处理函数
  const handleCellEditStart = (row, col) => {
    if (!canWrite || !socketReady) {
      console.log('WebSocket 尚未准备好，取消编辑');
      return;
    }
    
    const cell = { row, col };
    console.log('Cell edit start:', cell);
    
    // 检查单元格是否被锁定
    const lockKey = `${row}_${col}`;
    if (lockedCells[lockKey]) {
      message.warning(`单元格正在被 ${lockedCells[lockKey].username} 编辑`);
      return false;
    }
    
    // 发送锁定请求
    socketRef.current?.emit('lock_cell', {
      fileId,
      userId: user.id,
      username: user.username,
      shareCode: shareCode,
      cell
    });
    
    return true;
  };

  // 处理单元格完成编辑
  const handleCellEditEnd = async (value, row, col) => {
    console.log('Checking write permission:', canWrite);
    if (!canWrite) {
        console.log('No write permission, edit rejected');
        return;
    }
    
    try {
        // 打印原始输入值
        console.log('Original row and col:', { row, col, value });
        
        // 处理行号
        let numericRow = parseInt(row, 10);
        
        // 处理列号 (已经是数字，不需要特殊处理)
        let numericCol = parseInt(col, 10);
        
        console.log('Processed row and col:', { numericRow, numericCol });

        const cell = { row: numericRow, col: numericCol };
        console.log('Cell edit end:', cell, 'value:', value);
        
        // 获取当前工作表信息
        const currentSheet = spreadsheetRef.current.sheet;
        const sheetName = currentSheet.name || '0';  // 默认工作表名称
        
        // 获取当前所有数据
        const allData = spreadsheetRef.current.getData();
        console.log('All data:', allData);
        
        // 获取当前工作表数据
        const currentSheetData = allData[0];  // 使用第一个工作表
        
        if (!currentSheetData) {
            console.error('No data found for current sheet:', sheetName);
            console.log('Available sheets:', allData.map(sheet => sheet.name));
            return;
        }
        
        // 发送更新消息
        const updateData = {
            fileId,
            userId: user?.id,
            shareCode,
            sheetName,
            row: numericRow,
            col: numericCol,
            value: value,
            allData: {
                name: sheetName,
                freeze: currentSheetData.freeze || 'A1',
                styles: currentSheetData.styles || [],
                merges: currentSheetData.merges || [],
                rows: currentSheetData.rows || {},
                cols: currentSheetData.cols || {},
                validations: currentSheetData.validations || [],
                autofilter: currentSheetData.autofilter || null
            }
        };
        
        console.log('Emitting cell_updated with data:', updateData);
        socketRef.current?.emit('cell_updated', updateData);
        
        // 解锁单元格
        socketRef.current?.emit('unlock_cell', {
            fileId,
            userId: user?.id,
            shareCode: shareCode,
            cell
        });
        
        // 自动保存到服务器
        await handleSave(allData);
        
    } catch (error) {
        console.error('Error handling cell edit:', error);
        message.error('更新失败');
    }
  };

  // 初始化 WebSocket 连接
  const initializeSocket = () => {
    try {
      // 断开现有连接
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // 创建新连接
      socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://47.108.78.58/', {
        transports: ['websocket'],
        upgrade: false,
        query: {
          fileId,
          userId: user?.id
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true
      });

      // 连接事件处理
      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        
        // 加入编辑房间
        setTimeout(() => {
          socketRef.current.emit('join_edit', {
            fileId,
            userId: user?.id,
            username: user?.username,
            shareCode: shareCode
          });
        }, 300);
        });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      socketRef.current.on('error', (error) => {
        console.error('Socket error:', error);
        message.error('WebSocket 连接错误');
      });

      // 断开连接事件处理
      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // 服务器断开连接，尝试重连
          socketRef.current.connect();
        }
      });

      // 接收单元格锁定事件
      socketRef.current.on('cell_locked', ({ cell, userId, username }) => {
        const key = `${cell.row}_${cell.col}`;
        setLockedCells(prev => ({ ...prev, [key]: { userId, username } }));
      });

      // 接收单元格解锁事件
      socketRef.current.on('cell_unlocked', ({ cell }) => {
        const key = `${cell.row}_${cell.col}`;
        setLockedCells(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      });

      // 接收其他用户的单元格内容更新
      //socketRef.current.on('cell_updated', ({ row, col, value }) => {
        //const sheet = spreadsheetRef.current?.sheet;
        //if (sheet) {
          //sheet.cellText(row, col, value);
        //}
      //});

      // 初次加入时接收服务端同步的完整表格内容
      socketRef.current.on('sync_data', ({ data }) => {
        spreadsheetRef.current?.loadData(data);
      });

      // 处理有用户加入协作
      socketRef.current.on('user_joined', ({ editors }) => {
        setEditors(editors);
      });

      // 处理有用户离开协作
      socketRef.current.on('user_left', ({ editors }) => {
        setEditors(editors);
      });

      // 监听用户加入
      socketRef.current.on('user_joined', ({ userId, username, editors: newEditors, canWrite: serverCanWrite, currentUser }) => {
        setEditors(newEditors);
        if (userId === user?.id) {
          message.success('成功加入编辑');
          setSocketReady(true); // 设置 socket 准备完成
        } else {
          message.info(`${username || '用户'} 加入了编辑`);
        }
        console.log('User joined event:', {
          userId,
          username,
          serverCanWrite,
          currentUser,
          currentUserId: user?.id
        });
        
        setEditors(newEditors);
        
        // 更新编辑权限（只更新当前用户的权限）
        /*if (userId === user?.id && serverCanWrite !== undefined) {
          console.log('Updating write permission:', serverCanWrite);
          setCanWrite(!!serverCanWrite);
        }*/
        
        // 如果是当前用户，显示加入成功消息
        if (userId === user?.id) {
          message.success('成功加入编辑');
        } else {
          message.info(`${username || '用户'} 加入了编辑`);
        }
      });

      // 监听用户离开
      socketRef.current.on('user_left', ({ userId, username, editors: newEditors }) => {
        setEditors(newEditors);
        message.info(`${username} 离开了编辑`);
      });

      // 监听单元格更新
      socketRef.current.on('cell_updated', ({ userId, sheetName, row, col, value, allData }) => {
        console.log('Received cell update:', { userId, sheetName, row, col, value, allData });
        
        if (userId !== user?.id) {  // 不处理自己的更新
            if (!spreadsheetRef.current || !spreadsheetRef.current.sheet) {
                console.log('Spreadsheet not initialized');
                return;
            }
            
            try {
                // 直接更新单元格内容
                if (typeof row === 'number' && typeof col === 'number') {
                    //const currentSheet = spreadsheetRef.current.sheet;
                    //currentSheet.setCellText(row, col, value);
                    spreadsheetRef.current.cellText(row, col, value).reRender();
                    /*spreadsheetRef.current.cellStyle(row, col, {
                      bgcolor: '#FFEB3B',
                      color: '#000000'
                    });*/
                    // 高亮更新的单元格
                    /*currentSheet.setCellStyle(row, col, {
                        bgcolor: '#FFEB3B',
                        color: '#000000'
                    });*/
                    
                    // 1秒后恢复单元格样式
                    setTimeout(() => {
                        /*currentSheet.setCellStyle(row, col, {
                            bgcolor: '#ffffff',
                            color: '#000000'
                        });*/
                        /*spreadsheetRef.current.cellStyle(row, col, {
                          bgcolor: '#ffffff',
                          color: '#000000'
                        });*/
                    }, 1000);
                }
            } catch (error) {
                console.error('Error updating cell:', error);
            }
        }
      });

      // 监听工作表切换
      socketRef.current.on('sheet_switched', ({ userId, sheetName }) => {
        console.log('Sheet switched by user:', userId, 'to sheet:', sheetName);
        
        if (userId !== user?.id) {  // 不处理自己的切换
          const currentSheet = spreadsheetRef.current.sheet;
          if (currentSheet.name !== sheetName) {
            spreadsheetRef.current.sheet.loadData({
              [sheetName]: spreadsheetRef.current.getData()[sheetName]
            });
          }
        }
      });

      // 监听保存通知
      socketRef.current.on('save_notification', ({ userId, username }) => {
        if (userId !== user.id) {
          message.info(`${username} 保存了文件`);
        }
      });

      // 监听单元格锁定
      socketRef.current.on('cell_locked', ({ cell, userId, username }) => {
        setLockedCells(prev => ({
          ...prev,
          [`${cell.row}_${cell.col}`]: { userId, username }
        }));
      });

      // 监听单元格解锁
      socketRef.current.on('cell_unlocked', ({ cell }) => {
        setLockedCells(prev => {
          const newLocks = { ...prev };
          delete newLocks[`${cell.row}_${cell.col}`];
          return newLocks;
        });
      });

      // 监听锁定被拒绝
      socketRef.current.on('lock_rejected', ({ cell, lockedBy }) => {
        message.warning(`单元格正在被 ${lockedBy} 编辑`);
        spreadsheetRef.current.blur();  // 取消焦点
      });
    } catch (error) {
      console.error('Socket initialization error:', error);
      message.error('初始化 WebSocket 连接失败');
    }
  };

  // 保存文件
  const saveFile = async () => {
    try {
      if (!spreadsheetRef.current) {
        message.error('编辑器未初始化');
        return;
      }

      socketRef.current?.emit('save_request', {
        fileId,
        userId: user.id,
        shareCode: shareCode
      });

      const data = spreadsheetRef.current.getData();
      const workbook = dataToExcel(data);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      const formData = new FormData();
      formData.append('file', new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      }), fileInfo.filename);

      await axios.post(`/api/files/update/${fileId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      message.success('文件保存成功');
    } catch (error) {
      message.error('文件保存失败');
      console.error('Save file error:', error);
    }
  };

  // 下载文件
  const downloadFile = () => {
    try {
      if (!spreadsheetRef.current) {
        message.error('编辑器未初始化');
        return;
      }

      const data = spreadsheetRef.current.getData();
      const workbook = dataToExcel(data);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, fileInfo.filename);
    } catch (error) {
      message.error('文件下载失败');
      console.error('Download file error:', error);
    }
  };

  // 添加一个初始化编辑器的函数
  const initializeSpreadsheet = () => {
    if (!containerRef.current || spreadsheetRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    spreadsheetRef.current = new Spreadsheet(container, {
      mode: canWrite ? 'edit' : 'read',  // 根据权限设置模式
      showToolbar: canWrite,  // 根据权限显示工具栏
      showGrid: true,
      showContextmenu: canWrite,  // 根据权限显示右键菜单
      view: {
        height: () => containerHeight,
        width: () => containerWidth,
      },
      row: {
        len: 100,
        height: 25,
      },
      col: {
        len: 26,
        width: 100,
        indexWidth: 60,
        minWidth: 60,
      },
      style: {
        bgcolor: '#ffffff',
        align: 'left',
        valign: 'middle',
        textwrap: false,
        strike: false,
        underline: false,
        color: '#0a0a0a',
        font: {
          name: 'Helvetica',
          size: 10,
          bold: false,
          italic: false,
        },
      },
      // 直接在配置中设置事件处理器
      /*onSelected: (cell, ri, ci) => {
        if (canWrite) {
          handleCellEditStart(ri, ci);
        }
      },
      onCellEdited: (text, ri, ci) => {
        handleCellEditEnd(ri, ci, { text });
      }*/
    });

    spreadsheetRef.current.on('cell-selected', (cell, ri, ci) => {
      if (canWrite) {
        handleCellEditStart(ri, ci);
      }
    });
    spreadsheetRef.current.on('cell-edited', handleCellEditEnd);

    //全局监听
    spreadsheetRef.current.on('change', () => {
      if (!canWrite || !isInitialLoadDone) return;

      const allData = spreadsheetRef.current.getData();
      socketRef.current?.emit('sync_data', {
        fileId,
        userId: user?.id,
        shareCode,
        data: null
      });

      console.log('[client] sync_data emitted with no data to avoid overwrite');
    });

    // 加载文件
    loadExcelData();

    // 初始化 WebSocket
    initializeSocket();
  };

  // 修改 useEffect
  useEffect(() => {
    // 使用 requestAnimationFrame 确保 DOM 已经渲染
    const initTimer = requestAnimationFrame(() => {
      initializeSpreadsheet();
    });

    // 清理函数
    return () => {
      cancelAnimationFrame(initTimer);

      if (socketRef.current) {
        socketRef.current.emit('leave_edit', {
          fileId,
          userId: user?.id
        });
        socketRef.current.disconnect();
      }

      // 清理编辑器
      if (containerRef.current && spreadsheetRef.current) {
        // 移除所有子元素
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        spreadsheetRef.current = null;
      }
    };
  }, [fileId, canWrite]); // 添加 canWrite 作为依赖项

  // 添加一个监听窗口大小变化的 useEffect
  useEffect(() => {
    const handleResize = () => {
      if (spreadsheetRef.current && containerRef.current) {
        const container = containerRef.current;
        spreadsheetRef.current.sheet.reload();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      <div style={{ 
        padding: '16px', 
        background: '#fff', 
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          {canWrite && (
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSave}
              disabled={!canWrite}
            >
              保存
            </Button>
          )}
          <Button 
            icon={<DownloadOutlined />} 
            onClick={downloadFile}
          >
            下载
          </Button>
        </Space>
        <Space>
          {Object.entries(editors).map(([userId, username]) => (
            <Tooltip key={userId} title={username}>
              <Badge 
                status="success" 
                offset={[0, 28]}
              >
                <Avatar icon={<UserOutlined />} />
              </Badge>
            </Tooltip>
          ))}
        </Space>
      </div>
      <div ref={containerRef} style={{ height: 'calc(100vh - 200px)' }} />
    </div>
  );
};

export default ExcelEditor; 
