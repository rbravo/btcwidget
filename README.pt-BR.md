# BTC Widget

[English](README.md) | **Português**

Widget de mesa com o preço do Bitcoin em tempo real e o gráfico recente, feito para um Raspberry Pi 4B com tela SPI touch de 3.5" (480×320, controlador de toque XPT2046).

<img src="docs/screenshot.png" width="480" alt="BTC Widget em 480x320: preço do BTC/USD ao vivo, variação em 24h e gráfico">

O build gera **um único arquivo**, `dist/index.html` (~240 KB, com JS e CSS embutidos). Ele abre direto do disco (`file://`), sem servidor.

- Preço ao vivo via WebSocket da Binance (atualiza a cada ~1 s)
- Gráfico de 1H, 24H, 7D, 30D ou 1A (1 ano), com máxima, mínima e linha pontilhada no preço de abertura do período
- Variação do período selecionado (verde ou vermelho)
- USD ou BRL
- Layout fluido: funciona em qualquer resolução, deitado (480×320) ou em pé (320×480)

## Uso na tela

| Toque em…                    | Faz                          |
| ---------------------------- | ---------------------------- |
| botões **1H 24H 7D 30D 1A**  | troca o período do gráfico   |
| **preço** ou **BTC/USD**     | alterna entre USD e BRL      |

As escolhas ficam salvas (localStorage) e voltam depois de reiniciar.

O indicador no topo mostra o estado da conexão: verde **ao vivo**, amarelo **conectando/reconectando**, vermelho **offline**. Quando não está ao vivo, o preço fica apagado e aparece o horário da última atualização.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:5173 (use o DevTools em 480x320 para simular a tela)
npm run build    # gera dist/index.html + dist/kiosk.sh
```

### Parâmetros de URL (opcionais)

Definem o padrão inicial. Um toque na tela tem prioridade e fica salvo.

| Parâmetro   | Valores                                                                         | Padrão |
| ----------- | ------------------------------------------------------------------------------- | ------ |
| `currency`  | `USD`, `BRL`                                                                    | `USD`  |
| `tf`        | `1H`, `24H`, `7D`, `30D`, `1A`                                                  | `24H`  |
| `reload`    | horas entre recarregamentos automáticos (`0` desliga)                           | `12`   |
| `inset`     | margem extra em px: `topo,direita,base,esquerda` (ou `20`, `0,20` como no CSS)  | `0`    |
| `calibrate` | `1` mostra réguas nas bordas para medir o `inset`                               | —      |

Exemplo: `index.html?currency=BRL&tf=7D`

## Instalação no Raspberry Pi

Suponho que a tela já funciona como monitor do Pi (driver/overlay instalado e a área de trabalho aparecendo nela).

### 1. Copiar os arquivos

Do PC:

```bash
npm run build
scp -r dist/ pi@raspberrypi.local:~/btcwidget
```

No Pi:

```bash
chmod +x ~/btcwidget/kiosk.sh
~/btcwidget/kiosk.sh          # teste; Alt+F4 fecha
```

O `kiosk.sh` abre o Chromium em tela cheia. Ele também evita a barra de "o Chromium não foi encerrado corretamente" depois de uma queda de energia e desliga o protetor de tela no X11.

### 2. Abrir sozinho no boot

Funciona nas versões com X11 (LXDE) e nas mais novas com Wayland (labwc/wayfire) do Raspberry Pi OS:

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/btcwidget.desktop <<EOF
[Desktop Entry]
Type=Application
Name=BTC Widget
Exec=$HOME/btcwidget/kiosk.sh
EOF
```

Se o seu sistema não ler `~/.config/autostart`, adicione o comando direto no autostart da sessão:

- **labwc** (Bookworm recente): linha `~/btcwidget/kiosk.sh &` em `~/.config/labwc/autostart`
- **wayfire**: em `~/.config/wayfire.ini`, seção `[autostart]`, `btc = ~/btcwidget/kiosk.sh`
- **X11/LXDE** (Bullseye e anteriores): linha `@/home/pi/btcwidget/kiosk.sh` em `~/.config/lxsession/LXDE-pi/autostart`

### 3. Ajustes recomendados

```bash
sudo raspi-config
```

- *System Options → Boot / Auto Login → Desktop Autologin*
- *Display Options → Screen Blanking → No* (a tela não apaga)

O cursor do mouse já fica escondido pela própria página.

### 4. Tela cortando as bordas

Alguns painéis (ou a própria case) escondem alguns pixels da borda, e aí o relógio ou a variação ficam cortados. Para medir:

```bash
~/btcwidget/kiosk.sh "calibrate=1"
```

Aparecem réguas de 0 a 60 px em cada borda. Em cada lado, o menor número que aparece inteiro é quanto a tela esconde. A linha verde tracejada mostra o `inset` atual: quando ela aparece nos quatro lados, está certo. Toque na tela para fechar a calibração.

Depois ajuste `DEFAULTS="inset=topo,direita,base,esquerda"` no começo do `kiosk.sh`. O padrão `inset=0,20,0,0` é para a tela em que este projeto foi montado, que esconde ~20 px à direita.

## Robustez para rodar 24/7

- Reconecta sozinho com backoff (1 s a 30 s) e volta na hora quando a rede retorna
- Watchdog: se ficar 20 s sem mensagem, derruba e refaz a conexão (cobre sockets "zumbis")
- Alterna para um host secundário da Binance se o primário falhar
- Recarrega o histórico do gráfico a cada 10 min e depois de cada reconexão, para não ficar com buracos
- Recarrega a página a cada 12 h (é um arquivo local, então funciona mesmo sem internet)
- Se der algum erro no React, mostra uma mensagem e recarrega em 10 s

## Fonte dos dados

Endpoints públicos de market data da Binance, sem chave de API:

- REST: `data-api.binance.vision/api/v3/klines` (fallback `api.binance.com`)
- WebSocket: `data-stream.binance.vision` (fallback `stream.binance.com:9443`), streams `miniTicker` + `kline`

USD usa o par `BTCUSDT`; BRL usa `BTCBRL`.
