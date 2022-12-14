#!/bin/bash

## git commands quick reference

# convert CRLF to LF but not in the other way
git config --global core.autocrlf input

# there is an error with npm7 or higher: downgrade to npm6
sudo npm install -g npm@6

# bootstrap
npm install bootstrap jquery popper.js @popperjs/core
# then add buttons on body
# instantiate jquery $
# add onclick callbacks