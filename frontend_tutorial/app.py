from flask import Flask, render_template
from whitenoise import WhiteNoise

app = Flask(__name__)
app.wsgi_app = WhiteNoise(app.wsgi_app, root="static/")


@app.route("/tutorial")
def tutorial():
    return render_template("tutorial.html")


@app.route("/game")
def game():
    return render_template("game.html")
