# Put any command that doesn't create a file here (almost all of the commands)
.PHONY: \
	bf \
    black \
    black_check \
    browserify \
	chown \
	clear_pyc \
	help \
	isort \
	isort_check \
	lint \
	mypy \
	update_requirements \

usage:
	@echo "Available commands:"
	@echo "bf..............................Shortcut to browserify"
	@echo "black...........................Format Python code"
	@echo "black_check.....................Checks Python code formatting without making changes"
	@echo "browserify......................Packages javascript files into one bundle.js file"
	@echo "chown...........................Change ownership of files to own user"
	@echo "clear_pyc.......................Remove all pyc files"
	@echo "help............................Display available commands"
	@echo "isort...........................Sort Python imports"
	@echo "isort_check.....................Checks Python import are sorted correctly without making changes"
	@echo "lint............................Run lint checking against the project"
	@echo "mypy............................Run mypy type hint inspection against project"
	@echo "update_requirements.............Update requirements file after adding a dependency"

black:
	@docker-compose run --rm frontend black frontend ${ARGS}

black_check:
	$(MAKE) black ARGS="--check"

browserify:
	@browserify static/game/js/game.js -o static/bundle.js

bf:
	$(MAKE) browserify

chown:
	@docker-compose run --rm frontend chown -R "`id -u`:`id -u`" "/code/${ARGS}"

clear_pyc:
	@docker-compose run --rm frontend find . -name '*.pyc' -delete

help:
	$(MAKE) usage

isort:
	@docker-compose run --rm frontend isort frontend ${ARGS}

isort_check:
	$(MAKE) isort ARGS="--check"

lint:
	@docker-compose run --rm frontend flake8 frontend ${ARGS}

mypy:
	@docker-compose run --rm frontend mypy frontend ${ARGS}

update_requirements:
	@docker-compose run --rm frontend pip freeze > requirements.txt
