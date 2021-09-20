from flask import Flask, render_template
from whitenoise import WhiteNoise

app = Flask(__name__)
app.wsgi_app = WhiteNoise(app.wsgi_app, root='static/')


@app.route("/")
def game():
    return render_template("game.html")
