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

### First step

With this project, you can work directly online with some **cloud service**, or on **localhost**, as you wish.

*If you don't want to use these tool's at all (Hooo -_-") jump to the second step -> clone and build the project*

In order to use these services, you need to sign up on:

- [GitHub](https://github.com/) (**required**) you must create a account on github (if you have not one yet !) in order to work on this project and fork them

- [Cloud9](https://c9.io/) (**optional**) you can signing with your GitHub / Bitbucket account if you have one, your project will be accessible from your dashboard then

**GitHub** will be our online versionned working copy

and

**Cloud9** will be our working station (node virtual machine, working IDE, testing server, etc...)

or

**localhost / bash** hmmm i like black screen :)


When you have created your account, if you want try Cloud9, please go to your Cloud9 dashboard, and create a new workspace, then start editing it.

### Clone and build the project

First, you need to fork the project from the original repository. Click on the *Fork* button on the top right corner of main project page.

When it's done, clone it !

If you are not in Cloud9, open a terminal, otherwise, you have a opened terminal in your cloud9 window, at the bottom. If they not, you can show it with *Tools > show console* **or** *Tools > terminal > new terminal*

clone the project:

    > git clone https://github.com/[YOUR_ACCOUNT]/BackNode.git && cd BackNode

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
<h2>Example of code</h2>

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

* You can follow us on facebook and twitter, can see the demonstration : http://loicvieira.fr/backnodeV2

