make: backnode

backnode: npmAndBowerUpdate build

build: buildGrunt run

run: brandName runNode

install: installLocal ckeditor build

heroku: installLocal build


##########################################################


brandName:
	#    ____             _    _   _           _
	#   |  _ \           | |  | \ | |         | |
	#   | |_) | __ _  ___| | _|  \| | ___   __| | ___
	#   |  _ < / _` |/ __| |/ / . ` |/ _ \ / _` |/ _ \ JS
	#   | |_) | (_| | (__|   <| |\  | (_) | (_| |  __/
	#   |____/ \__,_|\___|_|\_\_| \_|\___/ \__,_|\___|
	#
	#
	# runing ...

installLocal:
	sudo npm i -g bower
	sudo npm i -g grunt-cli
	bower install bootstrap
	npm install

ckeditor:
	git submodule init && git submodule update
	cd ./submodules/ckeditor-dev/ && git pull origin stable
	./submodules/ckeditor-dev/dev/builder/build.sh
	cp  -rf ./submodules/ckeditor-dev/dev/builder/release/ckeditor/* ./app/ckeditor/

npmAndBowerUpdate:
	#If you have not bower, call "make install" before all
	bower update
	npm install

buildGrunt:
	#If you have not grunt, call "make install" before all
	grunt

runNode:
	node app/server.js
