make: install

install: modules build

build: buildGrunt run

run: brandName runNode





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

modules:
	./submodules/ckeditor-dev/dev/builder/build.sh
	npm install

buildGrunt:
	grunt

runNode:
	node app/server.js
