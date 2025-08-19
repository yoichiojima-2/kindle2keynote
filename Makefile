build:
	docker compose build

extract:
	docker compose run --rm app npm run extract -- $(ARGS)

shell:
	docker compose run --rm app bash

help:
	docker compose run --rm app npm start help