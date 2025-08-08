from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/lobby/<str:room_id>/', consumers.LobbyConsumer.as_asgi()),
    path('ws/match/<str:room_id>/', consumers.ChessConsumer.as_asgi()),
]