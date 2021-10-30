Net stop "OCS Inventory Service"
copy ocsinventory.ini "C:\ProgramData\OCS Inventory NG\Agent\" /y
Net start "OCS Inventory Service"