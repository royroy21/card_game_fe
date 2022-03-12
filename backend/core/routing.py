from chat import routing as chat_routing
from game import routing as game_routing

websocket_urlpatterns = (
    chat_routing.websocket_urlpatterns + game_routing.websocket_urlpatterns
)
