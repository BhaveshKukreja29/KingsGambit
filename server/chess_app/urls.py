from django.urls import path
from . import views

urlpatterns = [
    path('api/create-room/', views.create_room, name='create_room'),
    path('api/join-game/', views.join_game, name='join_game'),
    path('api/game-data/<str:room_id>', views.game_data, name='game_data'),
    path('api/get-csrf-token/', views.get_csrf_token, name='get_csrf_token'),

    path('api/register/', views.register_user, name='register_user'),
    path('api/login/', views.login_user, name='login_user'),
    path('api/logout/', views.logout_user, name='logout_user'),
    path('api/user/', views.check_auth_status, name='check_auth_status')

]