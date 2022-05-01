run: build
	docker run --init -it --rm --network=host lol

build:
	docker build -t lol . 
