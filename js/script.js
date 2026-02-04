// 电池制造商映射
const manufacturers = {
    0x00: { name: "A公司", color: "manufacturer-A" },
    0x01: { name: "B公司", color: "manufacturer-B" },
    0x02: { name: "C公司", color: "manufacturer-C" },
    0x03: { name: "D公司", color: "manufacturer-C" },
    0x04: { name: "E公司", color: "manufacturer-C" }
};

// 电池型号映射
const batteryModels = {
    0x00: "ABC",
    0x01: "123",
    0x02: "A-123",
    0x03: "B-456",
    0x04: "C-789"
};

// 默认状态数据（用于演示）
let currentState = {
    byte1: 0x10,  // 电池总容量低位
    byte2: 0x27,  // 电池总容量高位
    byte3: 0x12,  // 过充电压低位
    byte4: 0x34,  // 过充电压高位
    byte5: 0x56,  // 过放电压低位
    byte6: 0x78,  // 过放电压高位
    byte7: 0x90,  // 充电上限温度小数
    byte8: 0x12,  // 充电上限温度整数
    byte9: 0x34,  // 放电上限温度小数
    byte10: 0x56, // 放电上限温度整数
    byte11: 0x00, // 电池厂家
    byte12: 0x01, // 电池型号
    byte13: 0xAA, // 时间戳字节0
    byte14: 0xBB, // 时间戳字节1
    byte15: 0xCC, // 时间戳字节2
    byte16: 0xDD  // 时间戳字节3
};

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 检查URL中是否有数据参数
    checkUrlForData();
    
    // 解析数据并更新显示
    parseAndDisplayData();
    
    // 设置事件监听器
    document.getElementById('parse-url-btn').addEventListener('click', checkUrlForData);
    //document.getElementById('nfc-scan-btn').addEventListener('click', simulateNfcScan);
    document.getElementById('nfc-scan-btn').addEventListener('click', async function() {
        await realNfcScan();
    });
    document.getElementById('reset-btn').addEventListener('click', resetToDefault);
    
    // 更新最后更新时间
    updateLastUpdateTime();
});

// 检查URL中是否有数据参数
function checkUrlForData() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (dataParam && dataParam.length >= 32) {
        document.getElementById('current-url-data').textContent = dataParam;
        parseDataString(dataParam);
        showNotification('URL数据解析成功!', 'success');
    } else {
        document.getElementById('current-url-data').textContent = '未检测到数据参数';
        showNotification('URL中未找到有效数据参数', 'info');
    }
}

// 解析数据字符串
function parseDataString(dataStr) {
    // 确保数据字符串长度为32个字符（16字节的十六进制表示）
    if (dataStr.length < 32) {
        dataStr = dataStr.padEnd(32, '0');
    }
    
    // 每2个字符表示一个字节
    for (let i = 0; i < 16; i++) {
        const byteStr = dataStr.substring(i*2, i*2+2);
        const byteValue = parseInt(byteStr, 16);
        currentState[`byte${i+1}`] = isNaN(byteValue) ? 0 : byteValue;
    }
    
    // 更新显示
    parseAndDisplayData();
    updateLastUpdateTime();
}

// 解析并显示数据
function parseAndDisplayData() {
    // 计算电池总容量 (byte2 << 8) + byte1 (单位: mAh)
    const totalCapacity = (currentState.byte2 << 8) + currentState.byte1;
    
    // 计算电池过充上限电压 (byte4 << 8) + byte3 (单位: mV)
    const overchargeVoltage = (currentState.byte4 << 8) + currentState.byte3;
    
    // 计算电池过放上限电压 (byte6 << 8) + byte5 (单位: mV)
    const overdischargeVoltage = (currentState.byte6 << 8) + currentState.byte5;
    
    // 计算充电上限温度 (整数 + 小数/100)
    const chargeMaxTemp = currentState.byte8 + currentState.byte7 / 100;
    
    // 计算放电上限温度 (整数 + 小数/100)
    const dischargeMaxTemp = currentState.byte10 + currentState.byte9 / 100;
    
    // 获取电池厂家
    const manufacturer = manufacturers[currentState.byte11] || { name: "未知公司", color: "" };
    
    // 获取电池型号
    const model = batteryModels[currentState.byte12] || "未知型号";
    
    // 计算生产日期时间戳 (byte16 << 24) + (byte15 << 16) + (byte14 << 8) + byte13
    const timestamp = (currentState.byte16 << 24) + (currentState.byte15 << 16) + 
                     (currentState.byte14 << 8) + currentState.byte13;
    const productionDate = new Date(timestamp * 1000);
    
    // 计算当前电量百分比（模拟，实际应根据电压或其他传感器数据计算）
    // 这里我们使用一个简单的模拟：基于容量和电压的模拟值
    const batteryPercentage = Math.min(100, Math.max(0, 
        Math.floor((totalCapacity / 15000) * 100 * 0.8 + (overchargeVoltage / 5000) * 20)
    ));
    
    // 更新电池显示
    updateBatteryDisplay(batteryPercentage, totalCapacity);
    
    // 更新状态网格
    updateStatusGrid({
        totalCapacity,
        overchargeVoltage,
        overdischargeVoltage,
        chargeMaxTemp,
        dischargeMaxTemp,
        manufacturer,
        model,
        productionDate
    });
}

// 更新电池显示
function updateBatteryDisplay(percentage, totalCapacity) {
    document.getElementById('battery-percentage').textContent = `${percentage}%`;
    document.getElementById('battery-level').style.width = `${percentage}%`;
    document.getElementById('total-capacity').textContent = `${totalCapacity} mAh`;
    
    // 根据电量设置电池状态
    const statusText = document.getElementById('battery-status-text');
    if (percentage > 70) {
        statusText.textContent = "电量充足";
        statusText.style.color = "#27ae60";
    } else if (percentage > 30) {
        statusText.textContent = "电量中等";
        statusText.style.color = "#f39c12";
    } else {
        statusText.textContent = "电量不足";
        statusText.style.color = "#e74c3c";
    }
    
    // 根据电量设置电池颜色
    const batteryLevel = document.getElementById('battery-level');
    if (percentage > 70) {
        batteryLevel.style.background = "linear-gradient(90deg, #2ecc71, #27ae60)";
    } else if (percentage > 30) {
        batteryLevel.style.background = "linear-gradient(90deg, #f1c40f, #f39c12)";
    } else {
        batteryLevel.style.background = "linear-gradient(90deg, #e74c3c, #c0392b)";
    }
}

// 更新状态网格
function updateStatusGrid(data) {
    const statusGrid = document.getElementById('status-grid');
    
    // 清空现有内容
    statusGrid.innerHTML = '';
    
    // 创建状态卡片
    const statusCards = [
        {
            title: "电池总容量",
            icon: "fas fa-car-battery",
            value: data.totalCapacity,
            unit: "mAh",
            byteInfo: `BYTE1: 0x${currentState.byte1.toString(16).padStart(2, '0')}, BYTE2: 0x${currentState.byte2.toString(16).padStart(2, '0')}`,
            extraClass: ""
        },
        {
            title: "过充保护电压",
            icon: "fas fa-bolt",
            value: (data.overchargeVoltage / 1000).toFixed(2),
            unit: "V",
            byteInfo: `BYTE3: 0x${currentState.byte3.toString(16).padStart(2, '0')}, BYTE4: 0x${currentState.byte4.toString(16).padStart(2, '0')}`,
            extraClass: ""
        },
        {
            title: "过放保护电压",
            icon: "fas fa-bolt",
            value: (data.overdischargeVoltage / 1000).toFixed(2),
            unit: "V",
            byteInfo: `BYTE5: 0x${currentState.byte5.toString(16).padStart(2, '0')}, BYTE6: 0x${currentState.byte6.toString(16).padStart(2, '0')}`,
            extraClass: ""
        },
        {
            title: "充电上限温度",
            icon: "fas fa-thermometer-half",
            value: data.chargeMaxTemp.toFixed(2),
            unit: "°C",
            byteInfo: `BYTE7: 0x${currentState.byte7.toString(16).padStart(2, '0')}, BYTE8: 0x${currentState.byte8.toString(16).padStart(2, '0')}`,
            extraClass: data.chargeMaxTemp > 45 ? "temperature-high" : "temperature-normal"
        },
        {
            title: "放电上限温度",
            icon: "fas fa-thermometer-half",
            value: data.dischargeMaxTemp.toFixed(2),
            unit: "°C",
            byteInfo: `BYTE9: 0x${currentState.byte9.toString(16).padStart(2, '0')}, BYTE10: 0x${currentState.byte10.toString(16).padStart(2, '0')}`,
            extraClass: data.dischargeMaxTemp > 60 ? "temperature-high" : "temperature-normal"
        },
        {
            title: "电池厂家",
            icon: "fas fa-industry",
            value: data.manufacturer.name,
            unit: "",
            byteInfo: `BYTE11: 0x${currentState.byte11.toString(16).padStart(2, '0')}`,
            extraClass: data.manufacturer.color
        },
        {
            title: "电池型号",
            icon: "fas fa-barcode",
            value: data.model,
            unit: "",
            byteInfo: `BYTE12: 0x${currentState.byte12.toString(16).padStart(2, '0')}`,
            extraClass: ""
        },
        {
            title: "生产日期",
            icon: "fas fa-calendar-alt",
            value: data.productionDate.toLocaleDateString('zh-CN'),
            unit: "",
            byteInfo: `BYTE13-16: 0x${currentState.byte13.toString(16).padStart(2, '0')}...`,
            extraClass: ""
        }
    ];
    
    // 添加卡片到网格
    statusCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = `status-card ${card.extraClass}`;
        cardElement.innerHTML = `
            <h3><i class="${card.icon}"></i> ${card.title}</h3>
            <div class="value ${card.extraClass}">${card.value}</div>
            <div class="unit">${card.unit}</div>
            <div class="byte-info">${card.byteInfo}</div>
        `;
        statusGrid.appendChild(cardElement);
    });
}

// 模拟NFC扫描
function simulateNfcScan() {
    const nfcStatus = document.getElementById('nfc-status');
    nfcStatus.className = "nfc-status nfc-scanning";
    nfcStatus.style.display = "block";
    nfcStatus.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> 正在扫描NFC...请将设备靠近充电宝';
    
    // 禁用按钮
    const nfcBtn = document.getElementById('nfc-scan-btn');
    nfcBtn.disabled = true;
    nfcBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> 扫描中...';
    
    // 模拟NFC扫描延迟
    setTimeout(() => {
        // 模拟从NFC读取的数据
        const simulatedData = generateSimulatedData();
        
        // 解析数据
        parseDataString(simulatedData);
        
        // 显示成功消息
        nfcStatus.className = "nfc-status nfc-success";
        nfcStatus.innerHTML = `<i class="fas fa-check-circle"></i> NFC扫描成功！已读取并解析数据`;
        
        // 重新启用按钮
        nfcBtn.disabled = false;
        nfcBtn.innerHTML = '<i class="fas fa-nfc-signal"></i> NFC扫描获取数据';
        
        // 3秒后隐藏状态消息
        setTimeout(() => {
            nfcStatus.style.display = "none";
        }, 3000);
        
        showNotification('NFC数据读取成功!', 'success');
    }, 2000);
}

// 生成模拟数据
function generateSimulatedData() {
    // 生成随机的模拟数据
    let dataStr = "";
    for (let i = 1; i <= 16; i++) {
        // 为每个字节生成一个随机值，但保持在合理范围内
        let byteValue;
        switch(i) {
            case 1: case 2: // 容量
                byteValue = Math.floor(Math.random() * 256);
                break;
            case 3: case 4: // 过充电压
                byteValue = Math.floor(Math.random() * 256);
                break;
            case 5: case 6: // 过放电压
                byteValue = Math.floor(Math.random() * 256);
                break;
            case 7: case 9: // 温度小数
                byteValue = Math.floor(Math.random() * 100);
                break;
            case 8: case 10: // 温度整数
                byteValue = 30 + Math.floor(Math.random() * 30);
                break;
            case 11: // 厂家
                byteValue = Math.floor(Math.random() * 3);
                break;
            case 12: // 型号
                byteValue = Math.floor(Math.random() * 3);
                break;
            case 13: case 14: case 15: case 16: // 时间戳
                byteValue = Math.floor(Math.random() * 256);
                break;
            default:
                byteValue = Math.floor(Math.random() * 256);
        }
        dataStr += byteValue.toString(16).padStart(2, '0');
    }
    return dataStr;
}

// 重置数据
function resetToDefault() {
    // 重置为默认状态
    currentState = {
        byte1: 0x10,
        byte2: 0x27,
        byte3: 0x12,
        byte4: 0x34,
        byte5: 0x56,
        byte6: 0x78,
        byte7: 0x90,
        byte8: 0x12,
        byte9: 0x34,
        byte10: 0x56,
        byte11: 0x00,
        byte12: 0x01,
        byte13: 0xAA,
        byte14: 0xBB,
        byte15: 0xCC,
        byte16: 0xDD
    };
    
    parseAndDisplayData();
    updateLastUpdateTime();
    
    document.getElementById('current-url-data').textContent = '未检测到数据参数';
    showNotification('已重置为默认数据', 'info');
}

// 更新最后更新时间
function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('last-update-time').textContent = timeStr;
}

// 显示通知
function showNotification(message, type) {
    // 在实际应用中，这里可以添加一个更美观的通知系统
    console.log(`${type.toUpperCase()}: ${message}`);
}

// 实际NFC扫描功能（需要浏览器支持Web NFC API）
// 注意：Web NFC API目前仅在某些浏览器中可用（如Chrome for Android）
async function realNfcScan() {

    const nfcStatus = document.getElementById('nfc-status');
    nfcStatus.className = "nfc-status nfc-scanning";
    nfcStatus.style.display = "block";
    nfcStatus.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> 正在扫描NFC...请将设备靠近充电宝';
    
    // 禁用按钮
    const nfcBtn = document.getElementById('nfc-scan-btn');
    nfcBtn.disabled = true;
    nfcBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> 扫描中...';

    if (!('NDEFReader' in window)) {
        alert("您的浏览器不支持Web NFC API。请使用Chrome for Android浏览器。");
        return;
    }
    
    try {
        const ndef = new NDEFReader();
        await ndef.scan();
        
        ndef.addEventListener("readingerror", () => {
            showNotification("读取NFC标签时出错", "error");
        });
        
        ndef.addEventListener("reading", ({ message, serialNumber }) => {
            // 查找文本记录
            for (const record of message.records) {
                if (record.recordType === "text") {
                    const textDecoder = new TextDecoder(record.encoding);
                    const textData = textDecoder.decode(record.data);
                    
                    // 解析数据
                    parseDataString(textData);
                    showNotification("NFC数据读取成功!", "success");
                    

                    nfcStatus.className = "nfc-status nfc-success";
                    nfcStatus.innerHTML = `<i class="fas fa-check-circle"></i> NFC扫描成功！已读取并解析数据`;
                    
                    // 重新启用按钮
                    nfcBtn.disabled = false;
                    nfcBtn.innerHTML = '<i class="fas fa-nfc-signal"></i> NFC扫描获取数据';
                    
                    // 3秒后隐藏状态消息
                    setTimeout(() => {
                        nfcStatus.style.display = "none";
                    }, 3000);

                    const TextDiv = document.getElementById('url-data');
 
                    TextDiv.innerHTML = `
                        <h3><i class="fas fa-code"></i> Text数据参数示例</h3>
                        <p>在text参数来传递充电宝数据，例如：</p>
                        <p>10271234567890123456789012345678</p>
                        <p>当前Text数据: <span id="current-text-data">${textData || '未检测到数据参数'}</span></p>
                    `;
                    
                    // 更新界面
                    updateLastUpdateTime();
                    if (!nfcBtn.disabled) {
                        return;
                    }
                }
            }
        });
    } catch (error) {
        console.error("NFC扫描错误:", error);
        showNotification(`NFC错误: ${error.message}`, "error");
    }
}