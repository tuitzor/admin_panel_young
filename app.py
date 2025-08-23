from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    data = request.json
    # Здесь можно сохранять данные в базу
    print("Received data:", data)
    return jsonify({"status": "success", "message": "Данные получены"})

if __name__ == '__main__':
    app.run(debug=True)