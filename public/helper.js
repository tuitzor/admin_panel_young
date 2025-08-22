(async function() {
    'use strict';

    // 🌐 Настройки и константы
    const WS_URL = location.protocol === 'https:' ? 'wss://admin-panel-young.onrender.com' : 'ws://localhost:10000';
    const CLICK_TIMEOUT = 300; // Таймаут для определения тройного клика

    // 🧠 Состояния и переменные
    let socket = null;
    let isHtml2canvasLoaded = false;
    let isProcessing = false;
    let lastClickTime = 0;
    let clickCount = 0;

    // 🆔 Идентификаторы
    const helperId = `helper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let clientId = localStorage.getItem('clientId');
    if (!clientId) {
        clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('clientId', clientId);
    }
    console.log(`helper.js: Session ID: ${helperId}, Client ID: ${clientId}, URL: ${window.location.href}`);

    // 🖱️ Управление курсором
    function setCursor(state) {
        document.body.style.cursor = state === 'wait' ? 'wait' : 'default';
        console.log(`helper.js: Cursor set to ${state}`);
    }

    // 🖼️ Загрузка html2canvas
    function loadHtml2canvas() {
        if (isHtml2canvasLoaded) return;
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => {
            isHtml2canvasLoaded = true;
            console.log('helper.js: html2canvas loaded.');
            // Сбрасываем курсор после загрузки
            setCursor('default');
        };
        script.onerror = () => {
            console.error('helper.js: Failed to load html2canvas from CDN.');
            setCursor('default');
        };
        document.head.appendChild(script);
    }

    // 🚫 Отключение "бана"
    function disableBan() {
        const banScreen = document.querySelector('.js-banned-screen');
        if (banScreen) banScreen.remove();

        const originalAudio = window.Audio;
        window.Audio = function(src) {
            if (src && src.includes('beep.mp3')) {
                console.log('helper.js: Blocked beep.mp3.');
                return { play: () => {} };
            }
            return new originalAudio(src);
        };

        new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.classList?.contains('js-banned-screen')) {
                        node.remove();
                        console.log('helper.js: New .js-banned-screen removed.');
                    }
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    // 🔌 Подключение к WebSocket
    function connectWebSocket() {
        if (socket?.readyState === WebSocket.OPEN) return;

        socket = new WebSocket(WS_URL);

        socket.onopen = () => {
            console.log('helper.js: WebSocket connected.');
            socket.send(JSON.stringify({ type: 'helper_connect', role: 'helper', helperId, clientId }));
        };

        socket.onmessage = async event => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'answer' && data.questionId) {
                    updateAnswerWindow(data);
                }
            } catch (err) {
                console.error('helper.js: Parse error:', err);
            }
        };

        socket.onerror = error => {
            console.error('helper.js: WebSocket error:', error);
        };

        socket.onclose = () => {
            console.log('helper.js: WebSocket closed. Reconnecting...');
            setTimeout(connectWebSocket, 2000);
        };
    }

    // 📸 Создание и отправка скриншота
    async function takeScreenshot() {
        if (isProcessing || !isHtml2canvasLoaded) {
            console.log('helper.js: Screenshot processing in progress or html2canvas not loaded.');
            return;
        }

        isProcessing = true;
        setCursor('wait');
        const answerWindow = document.getElementById('answer-window');
        if (answerWindow) answerWindow.style.display = 'none';

        try {
            console.log('helper.js: Taking screenshot of visible viewport.');
            const canvas = await html2canvas(document.body, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                ignoreElements: (element) => element.id === 'answer-window'
            });

            const dataUrl = canvas.toDataURL('image/png');
            const data = {
                type: 'screenshot',
                dataUrl,
                helperId,
                clientId
            };

            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(data));
                console.log('helper.js: Screenshot sent successfully.');
            } else {
                console.error('helper.js: WebSocket not connected. Screenshot not sent.');
            }

        } catch (error) {
            console.error('helper.js: Screenshot failed:', error);
        } finally {
            isProcessing = false;
            setCursor('default');
            if (answerWindow) answerWindow.style.display = 'block';
        }
    }

    // 🪟 Управление окном ответов
    function createAnswerWindow() {
        let answerWindow = document.getElementById('answer-window');
        if (answerWindow) return;

        answerWindow = document.createElement('div');
        answerWindow.id = 'answer-window';
        Object.assign(answerWindow.style, {
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '200px',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            zIndex: '10000',
            borderRadius: '8px',
            border: '1px solid #333',
            boxSizing: 'border-box',
            display: 'block'
        });
        document.body.appendChild(answerWindow);

        // ... Логика перетаскивания (остается такой же, как в оригинале) ...
    }

    function updateAnswerWindow(data) {
        let answerWindow = document.getElementById('answer-window');
        if (!answerWindow) {
            createAnswerWindow();
            answerWindow = document.getElementById('answer-window');
        }

        let existingAnswer = answerWindow.querySelector(`[data-question-id="${data.questionId}"]`);
        if (existingAnswer) {
            existingAnswer.querySelector('p').textContent = data.answer || 'No answer yet';
        } else {
            const answerElement = document.createElement('div');
            answerElement.dataset.questionId = data.questionId;
            Object.assign(answerElement.style, {
                marginBottom: '10px',
                padding: '5px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '5px'
            });
            answerElement.innerHTML = `
                <h4 style="font-size: 12px; margin: 0 0 5px; color: #aaa;">Question ID: ${data.questionId.split('-').pop()}</h4>
                <p style="font-size: 14px; margin: 0; color: #fff;">${data.answer || 'Waiting...'}</p>
            `;
            answerWindow.appendChild(answerElement);
            answerWindow.scrollTop = answerWindow.scrollHeight; // Автопрокрутка вниз
        }
        answerWindow.style.display = 'block';
    }

    // 👂 События
    document.addEventListener('mousedown', event => {
        const currentTime = Date.now();
        if (currentTime - lastClickTime < CLICK_TIMEOUT) {
            clickCount++;
        } else {
            clickCount = 1;
        }
        lastClickTime = currentTime;

        // Двойной клик правой кнопкой
        if (event.button === 2 && clickCount === 2) {
            event.preventDefault();
            const answerWindow = document.getElementById('answer-window');
            if (answerWindow) {
                answerWindow.style.display = answerWindow.style.display === 'none' ? 'block' : 'none';
            } else {
                createAnswerWindow();
                const newWindow = document.getElementById('answer-window');
                if (newWindow) newWindow.style.display = 'block';
            }
            clickCount = 0; // Сброс счетчика
        }
        
        // Тройной клик левой кнопкой
        if (event.button === 0 && clickCount === 3) {
            event.preventDefault();
            takeScreenshot();
            clickCount = 0; // Сброс счетчика
        }
    });

    // 🚀 Инициализация
    function init() {
        loadHtml2canvas();
        disableBan();
        connectWebSocket();
        createAnswerWindow(); // Создаем окно при загрузке, но скрываем
        const answerWindow = document.getElementById('answer-window');
        if (answerWindow) answerWindow.style.display = 'none';
        setCursor('wait');
    }
    
    init();

})();
