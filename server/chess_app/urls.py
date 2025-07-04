from django.urls import path
from . import views

urlpatterns = [
    path('create-room/', views.create_room, name='create_room'),
    path('join-game/', views.join_game, name='join_game'),
    path('game-data/<str:room_id>', views.game_data, name='game_data')
]