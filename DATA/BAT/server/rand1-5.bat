@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
set /A MIN=1
set /A MAX=5

set /A SEED=%RANDOM%
set /A SEED_M_M=%MIN%+%SEED%-(%SEED%/(%MAX%-%MIN%+1))*(%MAX%-%MIN%+1)

for /l %%i in () do (
	ping -n !SEED_M_M! ya.ru > null
	set /A SEED=!RANDOM!
	echo !SEED! >> C:\Apache24\htdocs\swop.txt
)


	
	
	



