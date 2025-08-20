const express = require('express');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;
const secretKey = 'your-secret-key'; // Замените на безопасный ключ

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/screenshots', express.static(path.join(__dirname, 'public/screenshots')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const wss = new WebSocket.Server({ server: app.listen(port, () => {
    console.log(`Сервер запущен на порту: ${port}`);
    console.log(`WebSocket-сервер запущен на ws://localhost:${port}`);
}) });

const screenshotDir = path.join(__dirname, 'public/screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
    console.log('Сервер: Папка для скриншотов создана:', screenshotDir);
}

const helperData = new Map(); // helperId -> [screenshots]
const clients = new Map(); // clientId -> WebSocket
const helpers = new Map(); // helperId -> WebSocket
const admins = new Map(); // adminId -> WebSocket
const adminsInfo = new Map(); // adminId -> { username, online, lastConnected }

// === КОНЕЦ НОВОГО КОДА ДЛЯ ШАХМАТ ===

function loadExistingScreenshots() {
    fs.readdirSync(screenshotDir).forEach(file => {
        const match = file.match(/^helper-([^-]+)-(\d+-\d+)\.png$/);
        if (match) {
            const helperId = `helper-${match[1]}`;
            const questionId = `${helperId}-${match[2]}`;
            if (!helperData.has(helperId)) {
                helperData.set(helperId, []);
            }
            helperData.get(helperId).push({ questionId, imageUrl: `/screenshots/${file}`, clientId: null, answer: '' });
        }
    });
    console.log(`Сервер: Загружено ${helperData.size} помощников с ${Array.from(helperData.values()).reduce((sum, v) => sum + v.length, 0)} скриншотами`);
}

loadExistingScreenshots();

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const validCredentials = {
        'AYAZ': 'AYAZ1',
        'admin1': 'admin1A',
        'admin2': 'admin2A',
        'admin3': 'admin3A',
        'admin4': 'admin4A',
        'admin5': 'admin5A'
    };

    if (validCredentials[username] && validCredentials[username] === password) {
        const token = jwt.sign({ username, role: 'admin' }, secretKey, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
    }
});

wss.on('connection', (ws) => {
    console.log('Сервер: Новый клиент подключился по WebSocket');
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
        console.log(`Сервер: Получен pong от клиента, helperId: ${ws.helperId || 'unknown'}, clientId: ${ws.clientId || 'unknown'}, adminId: ${ws.adminId || 'unknown'}`);
    });

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
            console.log('Сервер: Получено сообщение по WS:', data);
        } catch (err) {
            console.error('Сервер: Ошибка разбора сообщения:', err);
            return;
        }

        if (data.type === 'frontend_connect' && data.role === 'frontend') {
            ws.clientId = data.clientId || `anonymous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            clients.set(ws.clientId, ws);
            console.log(`Сервер: Фронтенд-клиент идентифицирован, clientId: ${ws.clientId}, активных фронтенд-клиентов: ${clients.size}`);
            const initialData = Array.from(helperData.entries()).map(([helperId, screenshots]) => ({
                helperId,
                hasAnswer: screenshots.every(s => s.answer && s.answer.trim() !== '')
            }));
            ws.send(JSON.stringify({ type: 'initial_data', data: initialData, clientId: ws.clientId }));
            // Уведомление админам о новом клиенте
            admins.forEach(adminWs => {
                if (adminWs.readyState === WebSocket.OPEN) {
                    adminWs.send(JSON.stringify({ type: 'new_client_connected', clientId: ws.clientId }));
                }
            });
        } else if (data.type === 'admin_connect' && data.role === 'admin') {
            ws.adminId = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            admins.set(ws.adminId, ws);
            adminsInfo.set(ws.adminId, { username: data.username, online: true, lastConnected: Date.now() });
            console.log(`Сервер: Админ подключился, adminId: ${ws.adminId}, ник: ${data.username}, активных админов: ${admins.size}`);
            // Отправляем все скриншоты
            const allScreenshots = Array.from(helperData.entries()).flatMap(([helperId, screenshots]) =>
                screenshots.map(screenshot => ({
                    helperId,
                    questionId: screenshot.questionId,
                    imageUrl: screenshot.imageUrl,
                    clientId: screenshot.clientId,
                    answer: screenshot.answer
                }))
            );
            ws.send(JSON.stringify({
                type: 'all_screenshots',
                screenshots: allScreenshots,
                adminId: ws.adminId
            }));
            console.log(`Сервер: Отправлены все скриншоты админу ${ws.adminId}`);
            // Отправляем список админов всем админам
            broadcastAdminList();
            // xAI: Новый админ также может быть шахматным игроком
            ws.isChessPlayer = true;
            chessPlayers.set(ws.adminId, ws);
            console.log(`Сервер: Админ ${ws.adminId} теперь также является шахматным игроком. Всего игроков: ${chessPlayers.size}`);
            broadcastChessState();
        } else if (data.type === 'request_initial_data') {
            const initialData = Array.from(helperData.entries()).map(([helperId, screenshots]) => ({
                helperId,
                hasAnswer: screenshots.every(s => s.answer && s.answer.trim() !== '')
            }));
            ws.send(JSON.stringify({ type: 'initial_data', data: initialData, clientId: data.clientId || 'anonymous' }));
        } else if (data.type === 'helper_connect' && data.role === 'helper') {
            ws.helperId = data.helperId;
            helpers.set(data.helperId, ws);
            if (!helperData.has(data.helperId)) {
                helperData.set(data.helperId, []);
            }
            console.log(`Сервер: Подключился помощник с ID: ${data.helperId}, активных помощников: ${helpers.size}`);
        } else if (data.type === 'screenshot') {
            const uniqueTimeLabel = `save-screenshot-${data.helperId}-${Date.now()}`;
            console.time(uniqueTimeLabel);
            const timestamp = Date.now();
            const filename = `${data.helperId}-${timestamp}-0.png`;
            const screenshotPath = path.join(screenshotDir, filename);
            const buffer = Buffer.from(data.dataUrl.split(',')[1], 'base64');
            sharp(buffer)
                .resize({ width: 1280 })
                .png({ quality: 80 })
                .toFile(screenshotPath)
                .then(() => {
                    console.log(`Сервер: Скриншот сохранен: ${screenshotPath}`);
                    const imageUrl = `/screenshots/${filename}`;
                    const questionId = `${data.helperId}-${timestamp}-0`;
                    if (!helperData.has(data.helperId)) {
                        helperData.set(data.helperId, []);
                    }
                    helperData.get(data.helperId).push({ questionId, imageUrl, clientId: data.clientId || null, answer: '' });
                    // Рассылка
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            if (client.clientId && client.clientId !== data.clientId) {
                                client.send(JSON.stringify({
                                    type: 'screenshot_info',
                                    questionId,
                                    imageUrl,
                                    helperId: data.helperId,
                                    clientId: client.clientId
                                }));
                                console.log(`Сервер: Сообщение о скриншоте отправлено фронтенду ${client.clientId}`);
                            } else if (client.adminId) {
                                client.send(JSON.stringify({
                                    type: 'new_screenshot',
                                    questionId,
                                    imageUrl,
                                    helperId: data.helperId,
                                    clientId: data.clientId,
                                    adminId: client.adminId
                                }));
                                console.log(`Сервер: Сообщение о скриншоте отправлено админу ${client.adminId}`);
                                // Уведомление о новом скриншоте
                                client.send(JSON.stringify({
                                    type: 'new_screenshot_notification',
                                    clientId: data.clientId,
                                    helperId: data.helperId
                                }));
                            }
                        }
                    });
                    console.timeEnd(uniqueTimeLabel);
                })
                .catch(err => {
                    console.error('Сервер: Ошибка сохранения скриншота:', err);
                    console.timeEnd(uniqueTimeLabel);
                });
        } else if (data.type === 'submit_answer') {
            // ... (без изменений)
        } else if (data.type === 'delete_screenshot') {
            // ... (без изменений)
        } else if (data.type === 'request_helper_screenshots') {
            // ... (без изменений)
        } else if (data.type === 'request_all_screenshots' && data.role === 'admin') {
            // ... (без изменений)
            // Также отправляем список админов
            broadcastAdminList(ws);
        } else if (data.type === 'chess_move' && ws.isChessPlayer) {
            // ... (без изменений)
        }
    });

    ws.on('close', () => {
        console.log('Сервер: Клиент отключился');
        if (ws.clientId) {
            // ... (без изменений)
        }
        if (ws.helperId) {
            // ... (без изменений)
        }
        if (ws.adminId) {
            const adminId = ws.adminId;
            if (adminsInfo.has(adminId)) {
                adminsInfo.get(adminId).online = false;
                adminsInfo.get(adminId).lastConnected = Date.now(); // Обновляем время
            }
            admins.delete(adminId);
            console.log(`Сервер: Админ с ID: ${adminId} отключился, активных админов: ${admins.size}`);
            broadcastAdminList();
            if (ws.isChessPlayer) {
                chessPlayers.delete(adminId);
                console.log(`Сервер: Шахматный игрок ${adminId} отключился. Всего игроков: ${chessPlayers.size}`);
                broadcastChessState();
            }
        }
    });
});

function broadcastAdminList(specificWs = null) {
    const adminList = Array.from(adminsInfo.entries()).map(([id, info]) => ({
        username: info.username,
        online: info.online,
        lastConnected: info.lastConnected
    }));
    const message = JSON.stringify({ type: 'admin_list_update', admins: adminList });
    if (specificWs) {
        if (specificWs.readyState === WebSocket.OPEN) {
            specificWs.send(message);
        }
    } else {
        admins.forEach(adminWs => {
            if (adminWs.readyState === WebSocket.OPEN) {
                adminWs.send(message);
            }
        });
    }
}

setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
        console.log('Сервер: Отправлен ping клиенту');
    });
}, 30000);

app.get('/status', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        status: 'active',
        helpersCount: helperData.size,
        frontendsCount: clients.size,
        adminsCount: admins.size,
        screenshotsCount: Array.from(helperData.values()).reduce((sum, v) => sum + v.length, 0),
        memoryUsage: process.memoryUsage()
    });
});

app.get('/list-screenshots', (req, res) => {
    fs.readdir(screenshotDir, (err, files) => {
        if (err) return res.status(500).send('Ошибка чтения папки');
        res.json(files);
    });
});
