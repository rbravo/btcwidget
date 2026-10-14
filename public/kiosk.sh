#!/bin/sh
# Abre o widget em tela cheia no Chromium (Raspberry Pi OS).
# Uso: ./kiosk.sh                     -> padrão
#      ./kiosk.sh "currency=BRL&tf=7D"
#      ./kiosk.sh "calibrate=1"       -> réguas para medir a borda que a tela esconde

# Padrões da página; o que for passado no argumento vem depois e tem prioridade.
# inset=topo,direita,base,esquerda (px): esta tela esconde ~20 px na borda direita.
DEFAULTS="inset=0,20,0,0"

DIR="$(cd "$(dirname "$0")" && pwd)"
URL="file://$DIR/index.html?$DEFAULTS${1:+&$1}"
BROWSER="$(command -v chromium-browser || command -v chromium)"

# depois de uma queda de energia o Chromium mostra "não foi encerrado corretamente"; isso evita a barra
PREFS="$HOME/.config/chromium/Default/Preferences"
if [ -f "$PREFS" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' "$PREFS"
fi

# X11: desliga protetor de tela / economia de energia do monitor
if [ -n "$DISPLAY" ] && command -v xset >/dev/null 2>&1; then
  xset s off -dpms s noblank 2>/dev/null
fi

exec "$BROWSER" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --disable-features=Translate \
  --no-first-run \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  --password-store=basic \
  "$URL"
