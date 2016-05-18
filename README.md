# Tool Application Starter Kit (TASK)

TASK is based on [Backbone.js](http://backbonejs.com) with [layoutmanager](http://layoutmanager.org), but has eliminated functionality that is unnecessary in a fully compiled, self contained build. We have extended it to be a full framework supporting multiple domains running on node.js.

## Environment setup

We prefer [Atom](http://atom.io) as our IDE and have provided a number of package and configuration files to help ensure we're all using the same coding standards.

You will need node.js and git to be able to setup, build and run this project.

### Requirements on OS X

On **OS X** it's easy to install if you have [Homebrew](http://brew.sh). (if not you should definitely get it!)

````bash
brew install nodejs git && git clone https://github.com/gunderson/rpi3-lighthub-resin.git
````

### Requirements on Ubuntu

Ubuntu is also fairly easy to setup:

````bash
sudo apt-get update && sudo apt-get install nodejs git && git clone https://github.com/gunderson/rpi3-lighthub-resin.git
````

### Requirements on Windows

Windows is a but more difficult to setup due to poor availability of package managers. We strongly recommend upgrading to the most recent version of windows and enabling the new "[Windows Subsystem for Linux](http://www.howtogeek.com/249966/how-to-install-and-use-the-linux-bash-shell-on-windows-10/)"

With this method, you can use the same commands as ubuntu to install your build dependencies:

````bash
apt-get update && apt-get install nodejs git && git clone https://github.com/gunderson/rpi3-lighthub-resin.git
````

## Project setup

After you've cloned the repo, you'll want to also install all the project dependencies. From the project root, run the following command to get up and running.

````bash
npm install -g gulp && npm install && apm install --package-file atom-packages.txt
````

## Fundamentals

Inside of the `/js/` folder in each domain there are a `server.js` server and a head file `index.js`. The application is spawned (and compiled from) `index.js`.

Likewise, inside of the `/sass` and `/pug/static` folders there are index files that will compile all included files at compile-time.

Javascript, stylesheets and template files are included for each part of the application, nested in their appropriate folders. Related `View.js` and `Model.js` Javascript files are contained in the `/js/modules/` folder inside a folder named for that module and should subclass their appropriate abstract classes located in `../shared/js/abstract/` folder.

Modules should use a consistent naming scheme throughout the application from the module name itself, to the related sass and pug files, to the classnames and IDs in the HTML itself. I have included a custom node module to create new Pages for convenience `npm add-page domain pagename`. This script will create necessary folder structure and add the created files to their relevant index files.

## Abstract classes

Abstract classes, located in `./src/shared/js/abstract/` are meant to be subclassed for convenience and framework functionality.

## Localization

TASK supports multiple locales that can be defined by adding sub-folders to the `./src/data/copy` folder with the locale designation as the folder name. JSON files in this folder will be concatenated and accessible through the `window.GLOBALS.COPY` variable. Each locale must use a consistent variable name structure to ensure that templating works across all locales.

At compile-time each locale has a localized version of the static template files rendered for that locale, accessed to the root of the dist folder. For "en" or "es", you would get: `index.en.html` or `index.es.html`. Additionally, the hero language for the site is copied to `index.html`.

Javascript and CSS are shared between locales. The rendered pages are given a a class to designate their locale `<html class="en">` in order to account for any styling tweaks that need to happen between locales.

## Deployment

Running the `gulp` command will build the site and place compiled files into the appropriate domain folders in `/dist`.

There are presently three separate environments available, **dev**, **stage**, and **prod**. These have settings inside `./src/shared/data/env/*.js`. The js files that make up the settings for each environment all are extended from a `default.js` to keep the process as *DRY* as possible.

Simply setting the `env` variable to any of these at the top of the gulpfile will build the site with the appropriate settings.

Each domain has a `main.js` file that starts servers and ties together back-end functionality as-needed.

**TODO:** let the environment be set through a commandline argument instead.
