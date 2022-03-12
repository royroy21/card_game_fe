import json
from typing import Dict

from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache

MESSAGE_TYPE_CONNECT_PLAYER = "connect_player"
MESSAGE_TYPE_DISCONNECT_PLAYER = "disconnect_player"
MESSAGE_TYPE_PLAYER_MESSAGE = "player_message"
ERROR_GAME_IS_FULL = "game_full"

GAME_TIME_TO_LIVE = 3600  # one hour

# Example of what a message should look like
# {
# 	"type": "connecting",
# 	"message": {
#       "origin",
#       "text",
#       "game": {
#           "gameID": "",
#           "player1": "",
#           "player2": "",
#       },
# 	},
# }


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_name = self.scope["url_route"]["kwargs"]["game_name"]
        self.game_group_name = "game_%s" % self.game_name

        # Add game name to available_games
        # cache so others can join that game
        games = cache.get("available_games") or []
        if self.game_name not in games:
            games.append(self.game_name)
            cache.set("available_games", games, GAME_TIME_TO_LIVE)

        # Add game data to cache
        if not cache.get(self.game_name):
            cache.set(self.game_name, {
                "gameID": self.game_name,
                "player1": "",
                "player2": "",
            }, GAME_TIME_TO_LIVE)

        # Join game group
        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name,
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave game group
        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name,
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        # Send message to game group
        await self.channel_layer.group_send(
            self.game_group_name,
            json.loads(text_data),
        )

    MESSAGE_CONNECTED = "connected"
    MESSAGE_RECONNECTED = "re-connected"

    async def connect_player(self, event: Dict):
        message = event["message"]
        player_id = message["origin"]
        game = cache.get(self.game_name)

        # Check player 1
        if not game["player1"]:
            game["player1"] = player_id
            text = self.MESSAGE_CONNECTED
        elif game["player1"] == player_id:
            text = self.MESSAGE_RECONNECTED

        # Check player 2
        elif not game["player2"]:
            game["player2"] = player_id
            text = self.MESSAGE_CONNECTED
            # Remove game from available games
            # as game now has required players
            games = cache.get("available_games") or []
            if self.game_name in games:
                games.remove(self.game_name)
                cache.set("available_games", games, GAME_TIME_TO_LIVE)

        elif game["player2"] == player_id:
            text = self.MESSAGE_RECONNECTED

        # Both players already connected
        else:
            text = ERROR_GAME_IS_FULL

        cache.set(self.game_name, game, GAME_TIME_TO_LIVE)
        await self.send(text_data=json.dumps({
            "origin": "Server",
            "text": f"{player_id} {text} to game {game['gameID']}",
            "game": game,
        }))

    async def player_message(self, event: Dict):
        await self.send(text_data=json.dumps({
            "origin": event["message"]["origin"],
            "text": event["message"]["text"],
            "game": cache.get(self.game_name),
        }))
