# Put any command that doesn't create a file here (almost all of the commands)
.PHONY: \
	attach \
    black \
    black_check \
	chown \
	clear_cache \
	clear_pyc \
	help \
	isort \
	isort_check \
	lint \
	migrate \
	migrations \
	mypy \
	manage \
	shell \
	update_requirements \

usage:
	@echo "Available commands:"
	@echo "attach..........................Attach to backend container. Useful for when using ipdb"
	@echo "black...........................Format Python code"
	@echo "black_check.....................Checks Python code formatting without making changes"
	@echo "chown...........................Change ownership of files to own user"
	@echo "clear_cache.....................Clears redis cache"
	@echo "clear_pyc.......................Remove all pyc files"
	@echo "help............................Display available commands"
	@echo "isort...........................Sort Python imports"
	@echo "isort_check.....................Checks Python import are sorted correctly without making changes"
	@echo "lint............................Run lint checking against the project"
	@echo "manage..........................Django's manage.py command"
	@echo "migrate.........................Run Django migrations"
	@echo "migrations......................Create Django migrations"
	@echo "mypy............................Run mypy type hint inspection against project"
	@echo "shell...........................Django's shell plus command"
	@echo "update_requirements.............Update requirements file after adding a dependency"

attach:
	@docker attach card_game_fe_backend_1

black:
	@docker-compose run --rm backend black backend ${ARGS}

black_check:
	$(MAKE) black ARGS="--check"

chown:
	@docker-compose run --rm backend chown -R "`id -u`:`id -u`" "/code/${ARGS}"

clear_cache:
	$(MAKE) manage ARGS="clear_cache ${ARGS}"

clear_pyc:
	@docker-compose run --rm backend find . -name '*.pyc' -delete

help:
	$(MAKE) usage

isort:
	@docker-compose run --rm backend isort backend ${ARGS}

isort_check:
	$(MAKE) isort ARGS="--check"

lint:
	@docker-compose run --rm backend flake8 backend ${ARGS}

manage:
	@docker-compose run --rm ${OPTIONS} backend python3 ${PYTHON_ARGS} manage.py ${ARGS}

migrate:
	$(MAKE) manage ARGS="migrate ${ARGS}"

migrations:
	$(MAKE) manage ARGS="makemigrations ${ARGS}"

mypy:
	@docker-compose run --rm backend mypy --config-file mypy.ini backend ${ARGS}

shell:
	$(MAKE) manage ARGS="shell_plus --ipython ${ARGS}"

update_requirements:
	@docker-compose run --rm backend pip freeze > requirements.txt
