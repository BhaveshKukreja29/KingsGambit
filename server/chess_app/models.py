from django.db import models
from django.contrib.auth.models import User
import uuid

def generate_room_id():
    return str(uuid.uuid4())[:8]

class Game(models.Model):
    room_id = models.CharField(max_length=8, unique=True, default=generate_room_id)

    white_player = models.ForeignKey(User, related_name='games_as_white', on_delete=models.SET_NULL, null=True)
    black_player = models.ForeignKey(User, related_name='games_as_black', on_delete=models.SET_NULL, null=True, blank=True)

    STATUS_CHOICES = [
        ('waiting', 'Waiting for Opponent'),
        ('playing', 'In Progress'),
        ('finished', 'Finished'),
    ]
    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='waiting')
    
    white_player_ready = models.BooleanField(default=False)
    black_player_ready = models.BooleanField(default=False)

    moves = models.JSONField(default=list)

    fen_position = models.CharField(max_length=100, default='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Game {self.room_id} - {self.status}"