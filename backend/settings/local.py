from .base import *  # noqa

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": "postgres",
        "USER": "postgres",
        "PASSWORD": "postgres",
        "HOST": "database",
        "PORT": 5432,
    }
}

# Add a custom_local.py file to import
# settings used locally not saved to GIT.
# try:
#     from .custom_local import *
# except ModuleNotFoundError:
#     pass

ENV = "local"

CORS_ALLOW_ALL_ORIGINS = True
