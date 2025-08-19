build:
	docker compose build

up:
	docker compose up -d

in:
	docker compose exec kindle-scraper bash

scrap:
	docker compose run kindle-scraper npm start help