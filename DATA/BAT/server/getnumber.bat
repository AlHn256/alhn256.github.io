@echo off
if "%1"=="itype" (goto :itype )

set /P firstline= <C:\Apache24\htdocs\swop.txt
echo Content-type: application/json
echo.
echo { "number": %firstline% }

findstr /V /R "^$" C:\Apache24\htdocs\swop.txt | more +1 | getnumber itype
goto :endf

:itype
more > C:\Apache24\htdocs\swop.txt
:endf