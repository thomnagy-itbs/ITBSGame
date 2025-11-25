# ITBS - System Restore (Game Design Document)

## 1. Vision & Metapher
Dies ist ein "Serious Game" / "Art Game", das die psychologische Belastung während einer unklaren Firmen-Reorganisation simuliert.
- **Ziel:** Das Gefühl von Ungewissheit, Stress und dem Versuch, trotz Chaos produktiv zu bleiben, erfahrbar machen.
- **Atmosphäre:** Dunkel, abstrakt, melancholisch (C-Moll), "Blade Runner" trifft "Brian Eno".

## 2. Kern-Mechaniken
- **Der Spieler (Weißes Quadrat):** Muss versuchen, Systeme zu stabilisieren und Aufgaben erfüllen.
- **Mental Health Bar (Confusion):** Startet bei 100% Gesundheit. Sinkt durch Kontakt mit Gerüchten.
    - *Metapher:* Je höher der Stress, desto langsamer wird der Spieler (Lethargie) und desto größer wirken die Bedrohungen (Angst verzerrt Wahrnehmung).
- **Anker (Blaue Kreise):** Sichere Häfen (Data Center, DevOps, etc.). Der Spieler muss darauf stehen bleiben, um den Fortschrittsbalken zu füllen.
    - *Metapher:* Fokus auf die Arbeit halten blendet den Lärm aus.

## 3. Gegner & NPCs
- **Gerüchte (Rote Kugeln):** Driften durch den Raum. Verfolgen den Spieler nicht aktiv, sind aber gefährlich.
    - *Physik:* Werden bei Treffern durch "Schockwellen" weggestoßen.
- **Kollegen (Kleine Punkte):**
    - **Neutral (Grau):** Laufen ruhig umher.
    - **Infiziert/Panisch (Orange):** Wenn sie ein Gerücht berühren, werden sie panisch. Kontakt mit ihnen erhöht den Stress des Spielers.
    - **Leadership-Mechanik:** Wenn der Spieler einen panischen Kollegen berührt, wird dieser "geheilt".
        - *Effekt:* Der Stress sinkt massiv (-15), eine **weiße Schockwelle** wird ausgelöst, die alle Gerüchte im Umkreis physikalisch wegstößt.

## 4. Audio & Visuelles Design
- **Audio:** Generative Web Audio API. C-Moll Skala.
    - *Low Stress:* Klarer, halliger Klang ("Digital Rain").
    - *High Stress:* Detuning (Verstimmung), Rauschen (Noise) nimmt zu, Echos schaukeln sich auf.
- **Grafik:** Minimalistisch, Geometrisch. Neon-Farben auf dunklem Grund.
    - *Geplant:* CRT-Monitor-Look, Parallax-Hintergrund.

## 5. Technischer Stack
- Vanilla JavaScript (`game.js`)
- HTML5 Canvas (`index.html`)
- CSS (`style.css`)
- Keine externen Libraries (außer für geplantes Backend).