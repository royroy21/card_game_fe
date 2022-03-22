import json
from typing import Dict, List

from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache

# Connecting messages
MESSAGE_TYPE_CONNECT_PLAYER = "connect_player"
MESSAGE_TYPE_PLAYER_CONNECTED = "player_connected"
MESSAGE_TYPE_DISCONNECT_PLAYER = "disconnect_player"
ERROR_GAME_IS_FULL = "game_full"

# Game messages
MESSAGE_CHAT = "chat"
MESSAGE_MOVE_CARD = "move_card"
MESSAGE_OTHER_PLAYER_CARD_MOVED = "other_player_card_moved"
MESSAGE_OTHER_PLAYER_UPDATED_DECK = "other_player_updated_deck"
MESSAGE_TYPE_PLAYER_MESSAGE = "player_message"

# Handler types
HANDLER_UPDATE_PLAYER_DECK = "update_deck_handler"
HANDLER_UPDATE_PLAYER_HAND = "update_hand_handler"
HANDLER_MOVE_PLAYER_CARD = "move_card_handler"

GAME_TIME_TO_LIVE = 3600  # one hour

# Example of what a message should look like
# {
# 	"type": "connecting",
# 	"message": {
#       "type": "player_connected"
#       "origin": {
#           "name": "",  # playerID / name
#           "player" "",  # player1 or player2
#       },
#       "text": "",
#       "data": {} or [],
#       "game": {
#           "gameID": "",
#           "player1": {
#               "name": "",
#               "deck": [],
#               "hand": [],
#            },
#           "player2": {
#               "name": "",
#               "deck": [],
#               "hand": [],
#           },
#       },
# 	},
# }


class GameConsumer(AsyncWebsocketConsumer):

    player_group_assigned = False

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
            cache.set(
                self.game_name,
                {
                    "gameID": self.game_name,
                    "player1": None,
                    "player2": None,
                },
                GAME_TIME_TO_LIVE,
            )

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
        player_id = message["origin"]["name"]
        deck = message["data"]["cards"]

        text = await self.assign_player_group(player_id, deck)

        game = cache.get(self.game_name)
        await self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_TYPE_PLAYER_CONNECTED,
                    "origin": {
                        "name": "Server",
                        "player": None,
                    },
                    "text": f"{player_id} {text} to game {game['gameID']}",
                    "game": game,
                }
            )
        )
        await self.channel_layer.group_send(
            self.get_player_group_to_send_to(event["message"]),
            {
                "type": HANDLER_UPDATE_PLAYER_DECK,
                "message": {
                    "origin": message["origin"],
                    "text": None,
                    "game": game,
                },
            },
        )

    async def assign_player_group(self, player_id: str, deck: List) -> str:
        print(f"trying with channel {self.channel_name}")

        if self.player_group_assigned:
            return self.MESSAGE_CONNECTED

        game = cache.get(self.game_name)

        # Check player 1
        if not game["player1"]:
            game["player1"] = {
                "name": player_id,
                "deck": deck,
            }
            text = self.MESSAGE_CONNECTED

            # Join player1 group
            print(f"player1 is channel {self.channel_name}")
            await self.channel_layer.group_add(
                "player1",
                self.channel_name,
            )
            self.player_group_assigned = True

        elif game["player1"]["name"] == player_id:
            text = self.MESSAGE_RECONNECTED

        # Check player 2
        elif not game["player2"]:
            game["player2"] = {
                "name": player_id,
                "deck": deck,
            }
            text = self.MESSAGE_CONNECTED
            # Remove game from available games
            # as game now has required players
            games = cache.get("available_games") or []
            if self.game_name in games:
                games.remove(self.game_name)
                cache.set("available_games", games, GAME_TIME_TO_LIVE)

            # Join player2 group
            print(f"player2 is channel {self.channel_name}")
            await self.channel_layer.group_add(
                "player2",
                self.channel_name,
            )
            self.player_group_assigned = True

        elif game["player2"]["name"] == player_id:
            text = self.MESSAGE_RECONNECTED

        # Both players already connected
        else:
            text = ERROR_GAME_IS_FULL

        # Update game to cache
        cache.set(self.game_name, game, GAME_TIME_TO_LIVE)

        return text

    async def chat(self, event: Dict):
        await self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_CHAT,
                    "origin": event["message"]["origin"],
                    "text": event["message"]["text"],
                    "game": cache.get(self.game_name),
                }
            )
        )

    async def update_deck(self, event: Dict):
        message = event["message"]
        player = message["origin"]["player"]
        game = cache.get(self.game_name)
        game[player]["deck"] = message["data"]["cards"]
        cache.set(self.game_name, game, GAME_TIME_TO_LIVE)
        await self.channel_layer.group_send(
            self.get_player_group_to_send_to(event["message"]),
            {
                "type": HANDLER_UPDATE_PLAYER_DECK,
                "message": {
                    "origin": event["message"]["origin"],
                    "text": None,
                    "game": game,
                }
            },
        )

    def get_player_group_to_send_to(self, message: Dict) -> str:
        if message["origin"]["player"] == "player1":
            return "player2"
        else:
            return "player1"


    async def update_deck_handler(self, event: Dict):
        await self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_OTHER_PLAYER_UPDATED_DECK,
                    "origin": event["message"]["origin"],
                    "text": event["message"]["text"],
                    "game": event["message"]["game"],
                }
            )
        )

    async def update_hand(self, event: Dict):
        message = event["message"]
        player = message["origin"]["player"]
        game = cache.get(self.game_name)
        game[player]["hand"] = message["data"]["cards"]
        cache.set(self.game_name, game, GAME_TIME_TO_LIVE)
        await self.channel_layer.group_send(
            self.get_player_group_to_send_to(event["message"]),
            {
                "type": HANDLER_UPDATE_PLAYER_HAND,
                "message": {
                    "origin": event["message"]["origin"],
                    "text": None,
                    "game": game,
                }
            },
        )

    async def update_hand_handler(self, event: Dict):
        await self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_OTHER_PLAYER_UPDATED_DECK,
                    "origin": event["message"]["origin"],
                    "text": event["message"]["text"],
                    "game": event["message"]["game"],
                }
            )
        )

    async def move_card(self, event: Dict):
        message = event["message"]
        player = message["origin"]["player"]
        game = cache.get(self.game_name)
        moved_card = message["data"]["card"]
        game[player]["deck"] = [
            card if card["id"] != moved_card["id"] else moved_card
            for card in game[player]["deck"]
        ]
        cache.set(self.game_name, game, GAME_TIME_TO_LIVE)
        await self.channel_layer.group_send(
            self.get_player_group_to_send_to(message),
            {
                "type": HANDLER_MOVE_PLAYER_CARD,
                "message": {
                    "origin": event["message"]["origin"],
                    "text": None,
                    "game": game,
                    "data": {
                        "card": moved_card,
                    },
                }
            },
        )

    async def move_card_handler(self, event: Dict):
        message = event["message"]
        await self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_OTHER_PLAYER_CARD_MOVED,
                    "origin": message["origin"],
                    "text": message["text"],
                    "game": message["game"],
                    "data": message["data"],
                }
            )
        )
