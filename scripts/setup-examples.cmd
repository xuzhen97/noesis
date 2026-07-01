@echo off
rem ponytail: cmd equivalent of setup-examples.sh
cd /d "%~dp0.."
git submodule update --init --recursive
