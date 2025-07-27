from channels.generic.websocket import AsyncWebsocketConsumer
import json
import uuid

class Player:
    def __init__(self, id, name):
        self.id = id
        self.name = name
    def to_dict(self):
        return {'id' : self.id, 'name' : self.name}

class Game:
    def __init__(self, white_player, black_player=None, moves=None, status='waiting', current_position='start'):
        self.white = white_player
        self.black = black_player
        self.moves = moves if moves is not None else []
        self.status = status
        self.current_position = current_position
    
    def to_dict(self):
        return {
            'white': self.white.to_dict() if self.white else None,
            'black': self.black.to_dict() if self.black else None,
            'moves': self.moves,
            'status': self.status,
            'current_position': self.current_position
        }
    
games = {}

class ChessConsumer(AsyncWebsocketConsumer):
    
    def get_session_data(self):
        return self.scope['session'].get('player_id'), self.scope['session'].get('player_name')

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'game_{self.room_id}'

        player_id, player_name = self.get_session_data()

        if not player_id or self.room_id not in games:
            await self.close()
            return

        game = games[self.room_id]
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        player_color = 'white' if game.white and game.white.id == player_id else 'black'

        await self.send(text_data=json.dumps({
            'type': 'game_start',
            'status': game.status,
            'position': game.current_position,
            'waiting_for_opponent': game.status == 'waiting',
            'player_color': player_color
        }))

        if game.status == 'playing' and game.white and game.black:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'opponent_joined',
                    'white_player_name': game.white.name, 
                    'black_player_name': game.black.name, 
                }
            )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    def get_player_name_from_session(self):
        return self.scope['session'].get('player_name')

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'move':
            await self.handle_move(data)
        elif message_type == 'chat_message':
            await self.handle_chat_message(data)
        elif message_type == 'video_signal':
            await self.handle_video_signal(data)

    async def handle_video_signal(self, data):
        peer_id = data.get('peerId') 

        if self.room_id in games and peer_id:
            await self.channel_layer.group_send( 
                self.room_group_name,
                {
                    'type': 'broadcast.video.signal',
                    'peerId': peer_id,
                    'sender': data.get('sender'),
                    'sender_channel_name': self.channel_name 
                }
            )

    
    async def handle_move(self, data):
        player_name = self.get_player_name_from_session()

        if not self.room_id or self.room_id not in games:
            return

        game = games[self.room_id]
        if game.status != 'playing':
            return

        game.current_position = data['fen'] 
        game.moves.append(data['move']) 

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'move_made',
                'from': data['from'],
                'to': data['to'],
                'sender_channel_name': self.channel_name
            }
        )

    async def move_made(self, event):
        if self.channel_name == event['sender_channel_name']:
            return

        await self.send(text_data=json.dumps({
            'type': 'move_made',
            'from': event['from'],
            'to': event['to'],
        }))

    async def handle_chat_message(self, data):
        sender = data['sender']
        message = data['message']

        if self.room_id in games:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type' : 'chat_message',
                    'message' : message,
                    'sender' : sender,
                    'sender_channel_name' : self.channel_name
                }
            )

    async def chat_message(self, event):
        if self.channel_name == event['sender_channel_name']:
            return 

        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'sender': event['sender']
        }))
    
    async def broadcast_video_signal(self, event):
        if self.channel_name == event['sender_channel_name']:
            return
        
        await self.send(text_data=json.dumps({
            'type': 'video_signal',
            'peerId': event['peerId'],
            'sender': event['sender'],
        }))

    async def opponent_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'opponent_joined',
            'white_player_name': event['white_player_name'],
            'black_player_name': event['black_player_name']
        }))