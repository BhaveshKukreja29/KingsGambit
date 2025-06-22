from django.urls import path
from . import consumers

# this will be populated later with actual WebSocket consumers
websocket_urlpatterns = [
    # path('ws/some_path/', consumers.SomeConsumer.as_asgi()),
]