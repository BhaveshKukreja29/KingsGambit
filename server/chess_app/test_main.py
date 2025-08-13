import pytest
import json
from django.contrib.auth.models import User
from django.urls import reverse
from django.test import Client
from chess_app.models import Game

pytestmark = pytest.mark.django_db

@pytest.fixture
def client():
    return Client()

def test_register_user(client):
    url = reverse('register_user')
    data = {'username': 'newuser', 'password': 'complexPassword1!'}
    response = client.post(url, json.dumps(data), content_type='application/json')
    assert response.status_code == 201
    assert User.objects.filter(username='newuser').exists()

def test_login_and_logout(client):
    user_data = {"username": "testuser", "password": "complexPassword1!"}
    User.objects.create_user(**user_data)
    
    login_url = reverse('login_user')
    response = client.post(login_url, json.dumps(user_data), content_type='application/json')
    assert response.status_code == 200

    logout_url = reverse('logout_user')
    response = client.post(logout_url)
    assert response.status_code == 200

    status_url = reverse('check_auth_status')
    response = client.get(status_url)
    assert response.status_code == 401

def test_create_and_join_room():
    user1_data = {"username": "user1", "password": "complexPassword1!"}
    user2_data = {"username": "user2", "password": "complexPassword1!"}
    
    user1 = User.objects.create_user(**user1_data)
    client1 = Client()
    client1.login(**user1_data)

    user2 = User.objects.create_user(**user2_data)
    client2 = Client()
    client2.login(**user2_data)

    create_url = reverse('create_room')
    response = client1.post(create_url)
    assert response.status_code == 200
    room_id = response.json()['room_id']
    assert Game.objects.filter(room_id=room_id).exists()

    join_url = reverse('join_game')
    join_data = {'room_id': room_id}
    response = client2.post(join_url, json.dumps(join_data), content_type='application/json')
    assert response.status_code == 200
    
    game = Game.objects.get(room_id=room_id)
    assert game.white_player == user1
    assert game.black_player == user2

def test_join_full_room_fails():
    user1_data = {"username": "user1", "password": "complexPassword1!"}
    user2_data = {"username": "user2", "password": "complexPassword1!"}
    user3_data = {"username": "user3", "password": "complexPassword1!"}

    User.objects.create_user(**user1_data)
    User.objects.create_user(**user2_data)
    User.objects.create_user(**user3_data)

    client1 = Client()
    client1.login(**user1_data)

    client2 = Client()
    client2.login(**user2_data)

    client3 = Client()
    client3.login(**user3_data)

    create_url = reverse('create_room')
    response = client1.post(create_url)
    room_id = response.json()['room_id']

    join_url = reverse('join_game')
    join_data = {'room_id': room_id}
    client2.post(join_url, json.dumps(join_data), content_type='application/json')

    response = client3.post(join_url, json.dumps(join_data), content_type='application/json')
    assert response.status_code == 400
    assert response.json()['error'] == 'This game is already full'