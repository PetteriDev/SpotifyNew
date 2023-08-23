from dotenv import load_dotenv
import os
import base64
import json
import requests
from requests import post, get
from pymongo import MongoClient
load_dotenv()

client_id = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")

client = MongoClient('mongodb://127.0.0.1:27017')
db = client['spotify']
collection = db['search_input']

def get_token():
    auth_string = client_id + ":" + client_secret
    auth_bytes = auth_string.encode("utf-8")
    auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

    url = "https://accounts.spotify.com/api/token"
    headers = {
        "Authorization": "Basic " + auth_base64,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    result = requests.post(url, headers=headers, data=data)
    json_result = json.loads(result.content)
    token = json_result["access_token"]
    return token

def get_auth_header(token):
    return {"Authorization": "Bearer " + token}

def search_for_artist(token, artist_name):
    url = "https://api.spotify.com/v1/search"
    headers = get_auth_header(token)
    query = f"?q={artist_name}&type=artist&limit=40"

    query_url = url + query

    result = get(query_url, headers=headers)
    json_result = json.loads(result.content)["artists"]["items"]
    if len(json_result) == 0:
        print("No artist with this name exists.")
        return None

    # Filter the results for an exact match of the artist name
    filtered_results = [artist for artist in json_result if artist["name"].lower() == artist_name.lower()]

    if len(filtered_results) == 0:
        print("No artist matching the specified criteria.")
        return None

    # Sort the filtered results based on popularity in descending order
    sorted_results = sorted(filtered_results, key=lambda x: x["popularity"], reverse=True)

    # Choose the best match (highest popularity) from the sorted results
    best_match = sorted_results[0]

    return best_match

def get_songs_by_artist(token, artist_id):
    url = f"https://api.spotify.com/v1/artists/{artist_id}/top-tracks?country=US"
    headers = get_auth_header(token)
    result = get(url, headers=headers)
    json_result = json.loads(result.content)["tracks"]

    # Sort the tracks based on popularity in descending order
    sorted_tracks = sorted(json_result, key=lambda x: x["popularity"], reverse=True)

    return sorted_tracks

def get_artist_popularity(token, artist_id):
    url = f"https://api.spotify.com/v1/artists/{artist_id}"
    headers = get_auth_header(token)
    result = get(url, headers=headers)
    json_result = json.loads(result.content)
    popularity = json_result["popularity"]
    return popularity

def get_search_input():
    document = collection.find_one({})
    if document:
        return document.get("searchInput")
    return None


token = get_token()
artist_name = get_search_input()

if artist_name:
    result = search_for_artist(token, artist_name)

if result:
    artist_id = result["id"]
    songs = get_songs_by_artist(token, artist_id)
    popularity = get_artist_popularity(token, artist_id)

    print(f"Artist: {result['name']}")
    print(f"Popularity: {popularity}")
    for idx, song in enumerate(songs):
        song_popularity = song["popularity"]
        print(f"{idx + 1}. {song['name']} - Popularity: {song_popularity}")