BackNode
========

POC for [CIFACOM](http://www.cifacom.com/) Week project

## First step

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

# Clone and build the project

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

for this project, we want to use [cloud-explorer](https://github.com/silexlabs/cloud-explorer) more details on functional spech tech ;)

but as you can see, it's an empty project, choose you own dependencies and make us dream with your technical choice !

## Deploy / Git / Pull request

when your feature it's done and you wants to merge it into the main repo, commit your modification in your forked repo, then create a **pull request to silexlabs/BackNode**. I will try to check soon as possible your pull request, do some comment's or not and merge it. Then, i deploy your modification on heroku server :

    http://nodejs-cms.herokuapp.com

the project must be **stable** when you create your pull request


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

