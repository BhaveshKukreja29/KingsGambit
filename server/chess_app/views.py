import json
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout, password_validation
from django.db import IntegrityError
from django.middleware.csrf import get_token
from django.core.exceptions import ValidationError
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Game
from django_ratelimit.decorators import ratelimit

def check_auth_status(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'isAuthenticated': True,
            'username': request.user.username,
        }, status=200)
    else:
        return JsonResponse({'isAuthenticated': False}, status=401)

@ratelimit(key='ip', rate='10/h', block=True)
def register_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        if not username or not password:
            return JsonResponse({'error': 'Username and password are required.'}, status=400)

        try:
            password_validation.validate_password(password)
        except ValidationError as e:
            return JsonResponse({'error': list(e.messages)}, status=400)


        try:
            user = User.objects.create_user(username=username, password=password)
            login(request, user)
            return JsonResponse({'username': user.username}, status=201)
        except IntegrityError:
            return JsonResponse({'error': 'Username already exists'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)

@ratelimit(key='ip', rate='10/m', block=True)
def login_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return JsonResponse({'username': user.username}, status=200)
        else:
            return JsonResponse({'error': 'Invalid username or password'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)

def logout_user(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'message': 'Logged out successfully'}, status=200)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)

@ratelimit(key='user', rate='20/h', block=True)
def create_room(request):
    if request.method == 'POST' and request.user.is_authenticated:
        game = Game.objects.create(white_player=request.user)
        return JsonResponse({
            'message': 'Room created successfully',
            'room_id': game.room_id,
        })
    return JsonResponse({'error': 'Invalid request or not authenticated'}, status=405)

@ratelimit(key='user', rate='30/h', block=True)
def join_game(request):
    if request.method == 'POST' and request.user.is_authenticated:
        try:
            data = json.loads(request.body)
            room_id = data.get('room_id')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        if not room_id:
            return JsonResponse({'error': 'Room ID is required'}, status=400)

        try:
            game = Game.objects.get(room_id=room_id)
        except Game.DoesNotExist:
            return JsonResponse({'error': 'This game does not exist'}, status=404)
        
        if game.white_player == request.user or game.black_player == request.user:
            return JsonResponse({'room_id': game.room_id, 'message': 'Rejoining game.'})

        if game.black_player is not None:
            return JsonResponse({'error': 'This game is already full'}, status=400)

        game.black_player = request.user
        game.save() 

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'lobby_{game.room_id}',
            {
                'type': 'lobby_state_update',
                'whitePlayer': game.white_player.username if game.white_player else None,
                'blackPlayer': game.black_player.username if game.black_player else None,
                'whitePlayerReady': game.white_player_ready,
                'blackPlayerReady': game.black_player_ready,
            }
        )

        return JsonResponse({
            'message': 'Joined room successfully',
            'room_id': game.room_id,
        })
    return JsonResponse({'error': 'Invalid request or not authenticated'}, status=405)

def lobby_data(request, room_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    try:
        game = Game.objects.get(room_id=room_id)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Game not found'}, status=404)

    if request.user != game.white_player and request.user != game.black_player:
        return JsonResponse({'error': 'You are not authorized to view this game'}, status=403)

    return JsonResponse({
        'roomId': game.room_id,
        'whitePlayer': game.white_player.username if game.white_player else None,
        'blackPlayer': game.black_player.username if game.black_player else None,
        'isUserWhite': request.user == game.white_player,
        'whitePlayerReady': game.white_player_ready,
        'blackPlayerReady': game.black_player_ready
    })

def game_data(request, room_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    try:
        game = Game.objects.get(room_id=room_id)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Game not found'}, status=404)

    if request.user != game.white_player and request.user != game.black_player:
        return JsonResponse({'error': 'You are not authorized to view this game'}, status=403)

    if request.user == game.white_player:
        player_color = 'white'
        opponent_name = game.black_player.username if game.black_player else None
    else:
        player_color = 'black'
        opponent_name = game.white_player.username if game.white_player else None

    return JsonResponse({
        'room_id': game.room_id,
        'player_color': player_color,
        'player_name': request.user.username,
        'opponent_name': opponent_name,
        'waiting_for_opponent': game.status == 'waiting',
        'initial_position': game.fen_position,
        'moves_history': game.moves
    })

def get_csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})