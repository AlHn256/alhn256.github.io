:begin
  @echo on
  cls
  @echo 1  - Start diskpart
  @echo 2  - Start Simvol image XP applying
  @echo 3  - Start Simvol image Windows 7 applying
  @echo 4  - bootrec
  @set /p a="Enter your choice: "
  @if "%a%" == "1"  goto diskpart 
  @if "%a%" == "2"  goto img
  @if "%a%" == "3"  goto start8
  @if "%a%" == "4"  goto rec

:diskpart

diskpart /s r:\part.ini
pause

goto begin

:img  
  @echo start   - Apply XP Simvol salon's image
  @echo.
  @set /p a="Type "start" to start applying Simvol image: "

  @if "%a%" == "start" goto start

goto begin
:start
  cls
  @echo off
  r:\imagex /apply r:\xp_2011\xp_c.wim 1 c:
  r:\imagex /apply r:\xp_2011\xp_d.wim 1 d:
  @echo on
  @echo Complete succesfully
  pause
goto begin

:img7  
  @echo start   - Apply Windows 7 Simvol salon's image
  @echo.
  @set /p a="Type "Win7" to start applying Simvol image: "

  @if "%a%" == "Win7" goto start8

goto begin

:start8
  cls
  @echo off
  r:\imagex /apply r:\Win7_x64\C_simvol_w7x64.wim 1 c:
  r:\imagex /apply r:\Win7_x64\D_simvol_w7x64.wim 1 d:
  @echo on
  @echo Complete succesfully
  pause
goto begin

:rec
  x:\Windows\system32\bootrec.exe /fixboot
  x:\Windows\system32\bootrec.exe /fixmbr
  x:\Windows\system32\bootrec.exe /rebuildbcd
pause
goto begin