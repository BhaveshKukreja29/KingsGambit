from django.http import JsonResponse
import uuid
from .consumers import Player, Game, games
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.middleware.csrf import get_token

def create_room(request):
    if request.method == 'POST':
        player_name = request.POST.get('player_name')
        if not player_name:
            return JsonResponse({'error': 'Player name is required'}, status=400)

        room_id = str(uuid.uuid4())[:8]
        player_id = str(uuid.uuid4())

        white_player = Player(id=player_id, name=player_name)
        games[room_id] = Game(
            white_player=white_player,
            black_player=None,
            moves=[],
            status='waiting',
            current_position='start'
        )

        request.session['player_id'] = player_id
        request.session['room_id'] = room_id 
        request.session['player_name'] = player_name
        request.session.save()

        return JsonResponse({
            'message': 'Room created successfully',
            'room_id': room_id,
            'player_id': player_id, 
            'player_name': player_name
        })
    return JsonResponse({'error': 'Invalid request method'}, status=405)

def join_game(request):
    if request.method == 'POST':
        room_id = request.POST.get('room_id')
        player_name = request.POST.get('player_name')

        if not room_id or not player_name:
            return JsonResponse({'error': 'Room ID and player name are required'}, status=400)

        if room_id not in games:
            return JsonResponse({'error': 'Game room not found'}, status=404)

        game = games[room_id]

        # Rejoin logic
        player_id_in_session = request.session.get('player_id')
        if player_id_in_session:
            if (game.white and game.white.id == player_id_in_session) or (game.black and game.black.id == player_id_in_session):
                return JsonResponse({
                    'message': 'Already in this game',
                    'room_id': room_id,
                    'player_id': player_id_in_session,
                    'player_name': request.session.get('player_name')
                })

        if game.black is not None:
            return JsonResponse({'error': 'This game is already full'}, status=400)

        player_id = str(uuid.uuid4())
        black_player = Player(id=player_id, name=player_name)
        game.black = black_player
        game.status = 'playing'

        # Set session variables for the joining player
        request.session['player_id'] = player_id
        request.session['room_id'] = room_id
        request.session['player_name'] = player_name
        request.session.save()

        return JsonResponse({
            'message': 'Joined room successfully',
            'room_id': room_id,
            'player_id': player_id,
            'player_name': player_name
        })
    return JsonResponse({'error': 'Invalid request method'}, status=405)

def game_data(request, room_id):
    if room_id not in games:
        return JsonResponse({'error': 'Game room not found'}, status=404)

    game = games[room_id]
    player_id = request.session.get('player_id')
    player_name = request.session.get('player_name')

    is_player_in_game = False
    player_color = None
    opponent_name = None

    if game.white and game.white.id == player_id:
        is_player_in_game = True
        player_color = 'white'
        opponent_name = game.black.name if game.black else None
    elif game.black and game.black.id == player_id:
        is_player_in_game = True
        player_color = 'black'
        opponent_name = game.white.name

    if not is_player_in_game:
        return JsonResponse({'error': 'You are not authorized to view this game'}, status=403)

    return JsonResponse({
        'room_id': room_id,
        'player_color': player_color,
        'player_name': player_name,
        'opponent_name': opponent_name,
        'waiting_for_opponent': game.status == 'waiting',
        'initial_position': game.current_position,
        'moves_history': game.moves
    })

def get_csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})

