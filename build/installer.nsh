!macro customInstall
  DetailPrint "Configuring Windows Firewall for MediSoft Local LAN Hub (Port 8088)..."
  nsExec::Exec 'netsh advfirewall firewall add rule name="MediSoft LAN Port 8088" dir=in action=allow protocol=TCP localport=8088'
!macroend

!macro customUnInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="MediSoft LAN Port 8088"'
!macroend

