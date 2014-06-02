make: brandName runNode

build: buildGrunt brandName runNode

dev: npmAndBower ckeditor buildGrunt brandName runNode


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

npmAndBower:
	#If you have not bower, call "sudo npm i -g bower" before all
	npm install
	bower install bootstrap
	bower update
	cp  -rf ./bower_components/bootstrap/dist/* ./app/bootstrap/
	cp  -rf ./bower_components/jquery/dist/jquery.min.js ./app/jquery/jquery.min.js

ckeditor:
	git submodule init && git submodule update
	cd ./submodules/ckeditor-dev/ && git pull origin stable
	./submodules/ckeditor-dev/dev/builder/build.sh
	cp  -rf ./submodules/ckeditor-dev/dev/builder/release/ckeditor/* ./app/ckeditor/

buildGrunt:
	#If you have not grunt, call "sudo npm i -g grunt-cli" before all
	grunt

runNode:
	node app/server.js
