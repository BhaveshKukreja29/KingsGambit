import json
import chess
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Game


class LobbyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'lobby_{self.room_id}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.broadcast_lobby_state()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'player_ready':
            await self.handle_player_ready()

    async def handle_player_ready(self):
        game = await self.get_game(self.room_id)
        if self.user == game.white_player:
            game.white_player_ready = True
        elif self.user == game.black_player:
            game.black_player_ready = True

        if game.white_player_ready and game.black_player_ready:
            import random
            if random.choice([True, False]):
                game.white_player, game.black_player = game.black_player, game.white_player
                game.white_player_ready, game.black_player_ready = game.black_player_ready, game.white_player_ready

            game.status = 'playing'

        await game.asave()
        await self.broadcast_lobby_state()

    async def broadcast_lobby_state(self):
        game = await self.get_game(self.room_id)
        if not game:
            return

        state = {   
            'type': 'lobby_state_update',
            'whitePlayer': game.white_player.username if game.white_player else None,
            'blackPlayer': game.black_player.username if game.black_player else None,
            'whitePlayerReady': game.white_player_ready,
            'blackPlayerReady': game.black_player_ready,
        }
        await self.channel_layer.group_send(self.room_group_name, state)

    async def lobby_state_update(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def get_game(self, room_id):
        try:
            return Game.objects.select_related('white_player', 'black_player').get(room_id=room_id)
        except Game.DoesNotExist:
            return None
        

class ChessConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'game_{self.room_id}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        game = await self.get_game(self.room_id)
        if game is None or (self.user != game.white_player and self.user != game.black_player):
            await self.close()
            return
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        await self.broadcast_game_state()

    async def disconnect(self, close_code):
        game = await self.get_game(self.room_id)
        if game and game.status != 'finished':
            game.status = 'finished'
            await game.asave()
            await self.broadcast_game_state()

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        handler = getattr(self, f'handle_{message_type}', None)
        if handler:
            await handler(data)

    async def handle_move(self, data):
        game = await self.get_game(self.room_id)
        if not game or game.status != 'playing':
            return

        board = chess.Board(game.fen_position)

        is_white_turn = board.turn == chess.WHITE
        is_black_turn = board.turn == chess.BLACK

        if (is_white_turn and self.user != game.white_player) or \
           (is_black_turn and self.user != game.black_player):
            return 

        move_uci = data.get('from', '') + data.get('to', '')
        move = chess.Move.from_uci(move_uci)

        if move in board.legal_moves:
            board.push(move)
            game.fen_position = board.fen()
            game.moves.append(move_uci)
            
            if board.is_checkmate() or board.is_stalemate() or board.is_insufficient_material():
                game.status = 'finished'

            await game.asave()
            await self.broadcast_game_state()
        else:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Illegal move'}))

    async def handle_chat_message(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat.message',
                'message': data.get('message'),
                'sender': self.user.username,
            }
        )

    async def handle_video_signal(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'video.signal',
                'peerId': data.get('peerId'),
                'sender': self.user.username,
            }
        )

    async def broadcast_game_state(self):
        game = await self.get_game(self.room_id)
        if not game:
            return

        game_state = {
            'type': 'game_state_update',
            'white_player': game.white_player.username if game.white_player else None,
            'black_player': game.black_player.username if game.black_player else None,
            'fen': game.fen_position,
            'status': game.status,
            'moves': game.moves,
        }
        await self.channel_layer.group_send(
            self.room_group_name, game_state
        )

    async def game_state_update(self, event):
        player_color = None
        if self.user == await self.get_white_player(self.room_id):
            player_color = 'white'
        elif self.user == await self.get_black_player(self.room_id):
            player_color = 'black'
        
        event['player_color'] = player_color
        await self.send(text_data=json.dumps(event))

    async def chat_message(self, event):
        if self.user.username != event['sender']:
            event['type'] = 'chat_message'
            await self.send(text_data=json.dumps(event))

    async def video_signal(self, event):
        if self.user.username != event['sender']:
            event['type'] = 'video_signal'
            await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def get_game(self, room_id):
        try:
            return Game.objects.select_related('white_player', 'black_player').get(room_id=room_id)
        except Game.DoesNotExist:
            return None

    async def get_white_player(self, room_id):
        game = await self.get_game(room_id)
        return game.white_player if game else None

    async def get_black_player(self, room_id):
        game = await self.get_game(room_id)
        return game.black_player