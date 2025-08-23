from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    try:
        data = request.json
        print("📋 Получены данные:", data)
        
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
        "status": "running",
        "message": "🚀 Веб-сайт работает нормально"
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
