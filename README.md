[![Build Status](https://travis-ci.org/silexlabs/BackNode.png?branch=master)](https://travis-ci.org/silexlabs/BackNode)
[![Dependency Status](https://gemnasium.com/silexlabs/BackNode.png)](https://gemnasium.com/silexlabs/BackNode)
[![Stories in Ready](https://badge.waffle.io/silexlabs/backnode.png?label=ready)](http://waffle.io/silexlabs/backnode)
[![Code Climate](https://codeclimate.com/github/silexlabs/BackNode.png)](https://codeclimate.com/github/silexlabs/BackNode)

BackNode
========

POC for [CIFACOM](http://www.cifacom.com/) Week project

[BackNode is GPL](http://www.gnu.org/copyleft/gpl.html)

## Webdesigner guide

This is how to make an HTML page editable by content writers and clients in [BackNode](http://www.backnode.io/).

First open the HTML file in a text editor.

### Make text fields editable

For all the nodes which are texts and which you want to be editable in BackNode, add the css class ```backnode-text``` or the HTML attribute ```data-bn="text"```.

### Make images editable

For all the nodes which are images and which you want to be editable in BackNode, add the css class ```backnode-image``` or the HTML attribute ```data-bn="image"```.

### Make HTML pages with Silex

The HTML pages created with [Silex website builder](http://www.silex.me) can also be edited in BackNode. The designer has to enter the advanced mode of Silex - tools > Apollo mode, and add the css classes provided above to the desired elements.

## Developer guide

### Clone and build the project

clone the project:

    > git clone https://github.com/silexlabs/BackNode.git && cd BackNode

Ok it's done, you can now build the project and start to work !

## Build the project

just enter make in your terminal :)

    > make

this make command will install npm dependencies (express / unifile / grunt / etc..), but other if you want -> package.json
launch grunt compilation
and run the project (server.js)

## User Interface
![BlackNote user interface](http://img15.hostingpics.net/pics/282120Tutorielstep1.jpg)
![BlackNote user interface](http://img15.hostingpics.net/pics/709320Tutorielstep2.jpg)
![BlackNote user interface](http://img15.hostingpics.net/pics/288913TutorielStep3.jpg)
![BlackNote user interface](http://img15.hostingpics.net/pics/314086Tutorielstep4.jpg)


## Keyword referencing
cms,
content management system,
free,
easy,
online,
webapp,
opensource,
community,
template,
editable,
duplicate,
html content,
edit,
backnode,
dynamic,
tool,
web tool,
silexlabs,
cifacom,
cloud explorer


## Technical attributes
* data-bn="edit" :  Edit your element
* data-bn="template" : To repeat the sub items of the type repeate
* data-bn="repeat" : Repeat element in a template.


```html
<!doctype html>
<html>
<head>
		<title>BackNode</title>
</head>
<body>
	 <h2 data-bn="edit">BackNode</h2>

     <div data-bn="edit" >
         Aliquam placerat vel rhoncus placerat turpis! Cum vel ut? Porttitor parturient phasellus.
     </div>

     <img src="https://www.google.com/images/srpr/logo11w.png" data-bn="edit"/>

</body>
</html>
```


## Contact

* You can follow us on facebook and twitter, can see the demonstration : http://www.backnode.io

