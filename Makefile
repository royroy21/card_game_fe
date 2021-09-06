# Put any command that doesn't create a file here (almost all of the commands)
.PHONY: \
	chown \
	clear_pyc \
	help \
	update_requirements \

usage:
	@echo "Available commands:"
	@echo "chown....................Change ownership of files to own user"
	@echo "clear_pyc................Remove all pyc files"
	@echo "help.....................Display available commands"
	@echo "update_requirements......Update requirements file after adding a dependency"

chown:
	@docker-compose run --rm flask chown -R "`id -u`:`id -u`" "/code/${ARGS}"

clear_pyc:
	@docker-compose run --rm flask find . -name '*.pyc' -delete

help:
	$(MAKE) usage

update_requirements:
	@docker-compose run --rm flask pip freeze > requirements.txt
