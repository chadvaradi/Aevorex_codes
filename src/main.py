from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello_aevorex():
    return 'Hello Aevorex!'

if __name__ == '__main__':
    app.run(debug=True)
