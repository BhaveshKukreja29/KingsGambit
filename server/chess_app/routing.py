from django.urls import path
from . import consumers

# this will be populated later with actual WebSocket consumers
websocket_urlpatterns = [
    path('ws/match/<str:room_id>/', consumers.ChessConsumer.as_asgi()),
]