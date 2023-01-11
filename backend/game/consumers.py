import functools
import json
import random
from typing import Dict, List, Optional

from asgiref.sync import async_to_sync
from channels.exceptions import StopConsumer
from channels.generic.websocket import WebsocketConsumer
from channels.layers import get_channel_layer
from channels.utils import await_many_dispatch
from django.core.cache import cache

# Connecting messages
MESSAGE_TYPE_PLAYER_CONNECTED = "player_connected"
ERROR_GAME_IS_FULL = "game_full"

# Game messages
MESSAGE_CHAT = "chat"
MESSAGE_ENEMY_CARD_MOVED = "enemy_card_moved"
MESSAGE_CREATE_ENEMY_DECK = "create_enemy_deck"
MESSAGE_ENEMY_ENDED_TURN = "enemy_ended_turn"

GAME_TIME_TO_LIVE = 3600  # one hour


class CustomWebsocketConsumer(WebsocketConsumer):
    """
    This allows for client to decide channel name.
    """

    async def __call__(self, scope, receive, send):
        """
        Dispatches incoming messages to type-based handlers asynchronously.
        """
        self.scope = scope

        # Initialize channel layer
        self.channel_layer = get_channel_layer(self.channel_layer_alias)
        if self.channel_layer is not None:
            self.channel_name = self.scope["url_route"]["kwargs"]["channel_name"]
            self.channel_receive = functools.partial(
                self.channel_layer.receive, self.channel_name
            )
        # Store send function
        if self._sync:
            self.base_send = async_to_sync(send)
        else:
            self.base_send = send
        # Pass messages in from channel layer or client to dispatch method
        try:
            if self.channel_layer is not None:
                await await_many_dispatch(
                    [receive, self.channel_receive], self.dispatch
                )
            else:
                await await_many_dispatch([receive], self.dispatch)
        except StopConsumer:
            # Exit cleanly
            pass


class GameConsumer(CustomWebsocketConsumer):

    player_group_assigned = False

    def connect(self):
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
                    "playerTurn": None,
                    "player1": None,
                    "player2": None,
                },
                GAME_TIME_TO_LIVE,
            )

        # Join game group
        async_to_sync(self.channel_layer.group_add)(
            self.game_group_name,
            self.channel_name,
        )

        self.accept()

    def disconnect(self, close_code):
        # Leave game group
        async_to_sync(self.channel_layer.group_discard)(
            self.game_group_name,
            self.channel_name,
        )

    # Receive message from WebSocket
    def receive(self, text_data):
        # Send message to game group
        async_to_sync(self.channel_layer.group_send)(
            self.game_group_name,
            json.loads(text_data),
        )

    MESSAGE_CONNECTED = "connected"
    MESSAGE_RECONNECTED = "re-connected"

    def connect_player(self, event: Dict):
        message = event["message"]
        player_id = message["origin"]["name"]
        deck = message["data"]["cards"]
        connect_message = self.initialize_player(player_id, deck)
        game = cache.get(self.game_name)
        self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_TYPE_PLAYER_CONNECTED,
                    "origin": {
                        "name": "Server",
                        "player": None,
                    },
                    "text": f"{player_id} {connect_message}"
                    f" to game {game['gameID']}",
                    "game": game,
                }
            )
        )
        self.channel_layer.group_send(
            self.get_enemy_player(event["message"]),
            {
                "type": "create_enemy_deck_handler",
                "message": {
                    "origin": message["origin"],
                    "text": None,
                    "game": game,
                },
            },
        )

    def create_enemy_deck_handler(self, event: Dict):
        self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_CREATE_ENEMY_DECK,
                    "origin": event["message"]["origin"],
                    "text": event["message"]["text"],
                    "game": event["message"]["game"],
                }
            )
        )

    def initialize_player(self, player_id: str, deck: List) -> str:
        if self.player_group_assigned:
            return self.MESSAGE_CONNECTED

        game = cache.get(self.game_name)

        # Check player 1
        if not game["player1"]:
            game["player1"] = self.get_initialize_player_game(player_id, deck)
            connect_message = self.MESSAGE_CONNECTED

            # Join player1 group
            async_to_sync(self.channel_layer.group_add)(
                "player1",
                self.channel_name,
            )
            self.player_group_assigned = True
        elif game["player1"]["name"] == self.channel_name:
            # This means the player is reconnecting
            connect_message = self.MESSAGE_CONNECTED
        elif game["player1"]["name"] == player_id:
            connect_message = self.MESSAGE_RECONNECTED

        # Check player 2
        elif not game["player2"]:
            game["player2"] = self.get_initialize_player_game(player_id, deck)
            connect_message = self.MESSAGE_CONNECTED
            # Remove game from available games
            # as game now has required players
            games = cache.get("available_games") or []
            if self.game_name in games:
                games.remove(self.game_name)
                cache.set("available_games", games, GAME_TIME_TO_LIVE)

            # Join player2 group
            async_to_sync(self.channel_layer.group_add)(
                "player2",
                self.channel_name,
            )
            self.player_group_assigned = True
        elif game["player2"]["name"] == self.channel_name:
            # This means the player is reconnecting
            connect_message = self.MESSAGE_CONNECTED
        elif game["player2"]["name"] == player_id:
            connect_message = self.MESSAGE_RECONNECTED

        # Both players already connected
        else:
            print("\nERROR: ", ERROR_GAME_IS_FULL, "\n")
            connect_message = ERROR_GAME_IS_FULL

        if not game["playerTurn"]:
            game["playerTurn"] = self.determine_player_first_turn(game)

        # Update game to cache
        cache.set(self.game_name, game, GAME_TIME_TO_LIVE)

        return connect_message

    def get_initialize_player_game(self, player_id, deck):
        return {
            "name": player_id,
            "deck": deck,
            "hand": [],
            "turn": 1,
            "drop_zones": {
                "playerZone1": None,
                "playerZone2": None,
                "playerZone3": None,
                "playerZone4": None,
                "playerZone5": None,
                "playerZone6": None,
            },
        }

    def determine_player_first_turn(self, game: Dict) -> Optional[str]:
        if game["player1"] and game["player2"]:
            return random.choice(["player1", "player2"])
        return None

    def chat(self, event: Dict):
        self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_CHAT,
                    "origin": event["message"]["origin"],
                    "text": event["message"]["text"],
                    "game": cache.get(self.game_name),
                }
            )
        )

    def get_enemy_player(self, message: Dict) -> str:
        player = message["origin"]["player"]
        return "player2" if player == "player1" else "player1"

    def moved_card(self, event: Dict):
        message = event["message"]
        game = message["game"]
        cache.set(self.game_name, game, GAME_TIME_TO_LIVE)
        self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_ENEMY_CARD_MOVED,
                    "origin": message["origin"],
                    "text": message["text"],
                    "game": game,
                    "data": message["data"],
                }
            )
        )

    def end_turn(self, event: Dict):
        message = event["message"]
        game = message["game"]
        game["playerTurn"] = self.get_enemy_player(message)
        cache.set(self.game_name, game, GAME_TIME_TO_LIVE)
        self.send(
            text_data=json.dumps(
                {
                    "type": MESSAGE_ENEMY_ENDED_TURN,
                    "origin": message["origin"],
                    "game": game,
                }
            )
        )
