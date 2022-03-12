from django.urls import path

from game import views

urlpatterns = [
    path("available-games/", views.get_available_games),
]
