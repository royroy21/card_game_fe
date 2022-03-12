from django.core.cache import cache
from django.http import JsonResponse


def get_available_games(request):
    return JsonResponse({
        "available_games": cache.get("available_games") or [],
    })
