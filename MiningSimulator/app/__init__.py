from flask import Flask

app = Flask(__name__)
app.secret_key = 'super-secret-mining-key-123' # Секретный ключ обязателен для работы сессий игрока!

# Импорт роутов пишется в самом конце, когда объект app уже создан
from app import routes