@echo off
cd /d "%~dp0"
echo Peli: http://localhost:8000
echo Editori: http://localhost:8000/tools/track-editor/editor.html
echo Pida tama ikkuna auki pelin ja editorin kayton ajan.
node server.js
pause
