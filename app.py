from flask import Flask, render_template, request, jsonify
import os
import threading
import time
from bot import start_bot

app = Flask(__name__)

# Флаг для отслеживания статуса бота
bot_started = False

def run_bot():
    """Запуск бота в отдельном потоке"""
    global bot_started
    try:
        print("🤖 Запуск Telegram бота...")
        start_bot()
    except Exception as e:
        print(f"❌ Ошибка запуска бота: {e}")
    finally:
        bot_started = False

# Запускаем бота при старте приложения
@app.before_first_request
def start_bot_thread():
    global bot_started
    if not bot_started:
        bot_thread = threading.Thread(target=run_bot, daemon=True)
        bot_thread.start()
        bot_started = True
        print("✅ Бот запущен в фоновом режиме")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    try:
        data = request.json
        print("📋 Получены данные:", data)
        
        # Здесь можно сохранять данные в базу или отправлять куда-то
        return jsonify({
            "status": "success", 
            "message": "✅ Данные успешно получены! Заявка оформлена."
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"❌ Ошибка: {str(e)}"
        })

@app.route('/status')
def status():
    return jsonify({
        "bot_status": "running" if bot_started else "stopped",
        "message": "🚀 Сервер работает нормально"
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('DEBUG', False))
