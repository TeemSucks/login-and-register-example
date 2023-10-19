# login and register example
i wanted to acutaly do something helpful on this account so...

next.js version here: https://github.com/TeemSucks/next-login-and-register-example

i also kindof hate when websites use thirdparty authentication like auth0.com
## future updates
uh.. if this gets 25 stars ill add profiles to it

for 100 stars ill add css to it and will make an option which uses json instead of mongoDB in settings
## requirements
node.js 19.4+

npm

windows/macos/linux (only tested on macos..)

vsc (not needed but recomended)
## install
```sh
git clone https://github.com/TeemSucks/login-and-register-example.git
cd login-and-register-example
```
```sh
npm i
```
## setup
- make a mongoDB account (dw its free even though there are paid upgrades)
- make a new database cluster
- get the uri and add the password to it
- add the uri to example.env
- change the port if you want in example.env
- rename example.env to .env
- change databaseName (line 19) to your clusters name
- run `npm i` if you havent already
## run
```sh
npm start
```
Make sure to change settings in node.js and in example.env then rename example.env to .env
